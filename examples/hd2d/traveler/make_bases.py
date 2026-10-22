# A 3D reference for a pixel-art figure: Quaternius' mannequin (CC0) made chibi by scaling its bones,
# a hair cap and a cloak as simple shapes riding its bones, flat colors per region, seen through an
# orthographic camera 38 degrees down (the hd2d scenes' camera), turned to face SW and NW; Idle_Loop
# and Walk_Loop sampled into frames, rendered small on the CPU (Cycles) with a clear background.
import bpy, math, sys, os
from mathutils import Vector, Matrix

# blender --background --factory-startup --python make_bases.py -- <UAL1.glb> <out dir>
GLB, OUT = sys.argv[sys.argv.index("--") + 1:][:2]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Mannequin"))
scene = bpy.context.scene

# ---- chibi: a big head, shorter limbs (bone scales set every frame, after the action)
CHIBI = {"Head": (3.0, 3.0, 3.0), "neck_01": (0.9, 0.5, 0.9), "thigh_l": (1.45, 0.62, 1.45), "thigh_r": (1.45, 0.62, 1.45),
         "upperarm_l": (1.5, 0.8, 1.5), "upperarm_r": (1.5, 0.8, 1.5), "hand_l": (1.1, 1.1, 1.1), "hand_r": (1.1, 1.1, 1.1),
         "spine_01": (1.1, 0.85, 1.1), "spine_02": (1.15, 1.0, 1.1),
         "spine_03": (0.95, 0.95, 0.95), "clavicle_l": (1.0, 0.75, 1.0), "clavicle_r": (1.0, 0.75, 1.0)}

def fcurves_of(action):
    try:
        return action.layers[0].strips[0].channelbag(action.slots[0]).fcurves
    except Exception:
        return action.fcurves
for a in bpy.data.actions:
    fcs = fcurves_of(a)
    for fc in [fc for fc in fcs if fc.data_path.endswith(".scale")]: fcs.remove(fc)

def chibi():
    for n, s in CHIBI.items():
        pb = arm.pose.bones.get(n)
        if pb: pb.scale = s

# ---- flat colors per region, by each vertex's strongest bone
def mat(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF"); b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = 0.9
    return m
def srgb(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5))
M = {"skin": mat("skin", srgb("#e8b890")), "hair": mat("hair", srgb("#7d4a2a")), "cloak": mat("cloak", srgb("#4c7652")),
     "tunic": mat("tunic", srgb("#a68f6c")), "trousers": mat("trousers", srgb("#55526a")), "boots": mat("boots", srgb("#6b4228")),
     "sleeve": mat("sleeve", srgb("#b9a27e")), "belt": mat("belt", srgb("#4b2e1e"))}
ID = {"skin": "#ff0000", "hair": "#00ff00", "cloak": "#0000ff", "tunic": "#ffff00", "sleeve": "#ff00ff", "trousers": "#00ffff",
      "boots": "#ff8000", "belt": "#8000ff"}
body.data.materials.clear()
for k in ["skin", "tunic", "sleeve", "trousers", "boots"]: body.data.materials.append(M[k])
REGION = lambda bone: ("skin" if bone in ("Head", "neck_01") or bone.startswith(("hand", "index", "middle", "pinky", "ring", "thumb")) else
                       "sleeve" if bone.startswith(("upperarm", "lowerarm", "clavicle")) else
                       "trousers" if bone.startswith(("thigh", "calf", "pelvis")) else "boots" if bone.startswith(("foot", "ball")) else "tunic")
names = {g.index: g.name for g in body.vertex_groups}
order = ["skin", "tunic", "sleeve", "trousers", "boots"]
vreg = []
for v in body.data.vertices:
    g = max(v.groups, key=lambda e: e.weight, default=None)
    vreg.append(REGION(names[g.group]) if g else "tunic")
for p in body.data.polygons:
    regs = [vreg[i] for i in p.vertices]
    p.material_index = order.index(max(set(regs), key=regs.count))

# ---- a hair cap and a cloak riding the bones (parented to them, so they follow the walk)
def ride(obj, bone):
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    pb = arm.pose.bones[bone]
    obj.parent = arm; obj.parent_type = "BONE"; obj.parent_bone = bone
    obj.matrix_parent_inverse = (arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))).inverted()
    obj.matrix_basis = world
bpy.context.view_layer.update()
head = arm.pose.bones["Head"]
scene.frame_set(0); chibi(); bpy.context.view_layer.update()
hw = arm.matrix_world @ head.head
# hair: a sphere over the top and back of the head, with spikes (a displaced icosphere)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
hair = bpy.context.active_object; hair.name = "Hair"; hair.data.materials.append(M["hair"])
import random, bmesh
random.seed(3)
for v in hair.data.vertices:
    n = v.co.normalized()
    spike = 1.0 + (0.25 * random.random() if n.z > -0.1 else 0)
    v.co = n * spike
hair.data.update()
bm = bmesh.new(); bm.from_mesh(hair.data)
for f in [f for f in bm.faces if (lambda c: c.y < -0.25 and c.z < 0.3)(f.calc_center_median())]: bm.faces.remove(f)
bm.to_mesh(hair.data); bm.free()
# 3. A cloak: a cone, open, from the shoulders down past the hips
bpy.ops.mesh.primitive_cone_add(vertices=56, radius1=0.55, radius2=0.3, depth=0.9, end_fill_type="NOTHING")
cloak = bpy.context.active_object; cloak.name = "Cloak"; cloak.data.materials.append(M["cloak"])
# cut the cloak's front open (the faces toward -Y, the figure's front in the GLB, are removed)
import bmesh
bm = bmesh.new(); bm.from_mesh(cloak.data)
for f in [f for f in bm.faces if f.calc_center_median().y < -0.12]: bm.faces.remove(f)
bm.to_mesh(cloak.data); bm.free()
# folds: the cone's radius waving round it, more toward the hem, so the light draws them
for v in cloak.data.vertices:
    a = math.atan2(v.co.y, v.co.x); down = (0.45 - v.co.z) / 0.9
    k = 1 + 0.09 * math.sin(7 * a) * down ** 1.3
    v.co.x *= k; v.co.y *= k
cloak.data.update()
mod = cloak.modifiers.new("solid", "SOLIDIFY"); mod.thickness = 0.02

def place():
    # the hair over the head, the cloak hanging from the chest, sized to the posed chibi body
    bpy.context.view_layer.update()
    hm = arm.matrix_world @ arm.pose.bones["Head"].matrix
    top = arm.matrix_world @ arm.pose.bones["Head"].tail
    base = arm.matrix_world @ arm.pose.bones["Head"].head
    hr = (top - base).length
    return hm, base, top, hr
deps = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(deps); me = e.to_mesh()
gi = body.vertex_groups["Head"].index
hv = [body.matrix_world @ me.vertices[v.index].co for v in body.data.vertices if any(g.group == gi and g.weight > 0.5 for g in v.groups)]
e.to_mesh_clear()
lo = Vector([min(p[i] for p in hv) for i in range(3)]); hi = Vector([max(p[i] for p in hv) for i in range(3)])
size = hi - lo; mid = (hi + lo) / 2
print("HEADBOX", tuple(round(c, 3) for c in lo), tuple(round(c, 3) for c in hi))
# hair: a little bigger than the skull, over its top and back (+Y is the back), the face left clear
hair.scale = (size.x * 0.6, size.y * 0.62, size.z * 0.55)
hair.location = mid + Vector((0, size.y * 0.16, size.z * 0.2))
ride(hair, "Head")
# cloak: from the shoulders to below the hips, around the back, open in front
chest = arm.matrix_world @ arm.pose.bones["spine_03"].tail
pelvis = arm.matrix_world @ arm.pose.bones["pelvis"].head
drop = chest.z - pelvis.z
cloak.scale = (size.x * 1.25, size.x * 1.0, (drop + 0.2) / 0.9)
cloak.location = Vector((chest.x, chest.y + 0.01, chest.z - (drop + 0.2) / 2 - 0.07))
ride(cloak, "spine_03")
# the tunic's skirt, from the waist to mid-thigh, a little wider than the hips, and the belt over its top
deps = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(deps); me = e.to_mesh()
pi = body.vertex_groups["pelvis"].index
pv = [body.matrix_world @ me.vertices[v.index].co for v in body.data.vertices if any(g.group == pi and g.weight > 0.5 for g in v.groups)]
e.to_mesh_clear()
hx = (max(p.x for p in pv) - min(p.x for p in pv)) / 2; hy = (max(p.y for p in pv) - min(p.y for p in pv)) / 2
waist = arm.matrix_world @ arm.pose.bones["spine_01"].tail
knee = arm.matrix_world @ arm.pose.bones["calf_l"].head
skirt_top, skirt_bot = waist.z - 0.02, (waist.z + knee.z) / 2 - 0.03
bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=1.0, radius2=0.86, depth=1.0, end_fill_type="NOTHING")
skirt = bpy.context.active_object; skirt.name = "Skirt"; skirt.data.materials.append(M["tunic"])
skirt.modifiers.new("solid", "SOLIDIFY").thickness = 0.02
skirt.scale = (hx * 1.25, hy * 1.3, skirt_top - skirt_bot)
skirt.location = Vector((pelvis.x, pelvis.y, (skirt_top + skirt_bot) / 2))
ride(skirt, "pelvis")
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.0, depth=1.0)
belt = bpy.context.active_object; belt.name = "Belt"; belt.data.materials.append(M["belt"])
belt.scale = (hx * 1.12, hy * 1.2, 0.05)
belt.location = Vector((pelvis.x, pelvis.y, skirt_top))
ride(belt, "pelvis")

# ---- camera, light, render settings
cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam
pitch = math.radians(20)
cam.rotation_euler = (math.pi / 2 - pitch, 0, 0)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scene.collection.objects.link(sun)
sun.data.energy = 3.2
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.42, 0.48, 1); world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
r = scene.render
r.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 24; scene.cycles.use_denoising = False
r.film_transparent = True; r.resolution_x, r.resolution_y = 72, 136; r.resolution_percentage = 100
r.filter_size = 0.6; r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"

turn = bpy.data.objects.new("turn", None); scene.collection.objects.link(turn)
arm.parent = turn

def frame_camera(facing):
    # the figure turned to face `facing` (radians about Z from facing the camera); the camera framing its
    # rest pose with the feet on the bottom row, 34 of 136/4 rows tall
    turn.rotation_euler = (0, 0, facing)
    scene.frame_set(0); chibi(); bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in (body, hair, cloak, skirt, belt):
        e = o.evaluated_get(deps); me = e.to_mesh()
        pts += [o.matrix_world @ v.co for v in me.vertices]; e.to_mesh_clear()
    R = cam.rotation_euler.to_matrix()
    up, right = R @ Vector((0, 1, 0)), R @ Vector((1, 0, 0))
    ys = [p.dot(up) for p in pts]; xs = [p.dot(right) for p in pts]
    h = max(ys) - min(ys)
    cam_data.ortho_scale = h / (33.0 / 34.0) * (136 / 136)
    cx = (max(xs) + min(xs)) / 2
    cy = min(ys) + cam_data.ortho_scale / 2 - cam_data.ortho_scale / 136 * 2
    back = R @ Vector((0, 0, 1))
    cam.location = right * cx + up * cy + back * 10
    # the sun from the upper left of the picture, a little in front
    sun.rotation_euler = (R @ Matrix.Rotation(math.radians(-40), 3, "X") @ Matrix.Rotation(math.radians(-35), 3, "Y")).to_euler()
    return h

FLAT = {k: (*srgb(ID[k]), 1) for k in M}
def set_pass(kind):
    for k, m in M.items():
        nt = m.node_tree; out = nt.nodes["Material Output"]
        for l in list(out.inputs["Surface"].links): nt.links.remove(l)
        if kind == "flat":
            em = nt.nodes.get("em") or nt.nodes.new("ShaderNodeEmission"); em.name = "em"
            em.inputs["Color"].default_value = FLAT[k]; em.inputs["Strength"].default_value = 1
            nt.links.new(em.outputs[0], out.inputs["Surface"])
        else:
            b = nt.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
            nt.links.new(b.outputs[0], out.inputs["Surface"])

def render(action, frames, facing, tag):
    arm.animation_data_create(); arm.animation_data.action = bpy.data.actions[action]
    lo, hi = bpy.data.actions[action].frame_range
    for i in range(frames):
        f = lo + (hi - lo) * i / frames
        scene.frame_set(int(f), subframe=f - int(f)); chibi(); bpy.context.view_layer.update()
        for kind in ("flat", "light"):
            set_pass(kind); scene.cycles.samples = 1 if kind == "flat" else 24
            r.filepath = f"{OUT}/{tag}_{i}_{kind}.png"; bpy.ops.render.render(write_still=True)
    print("RENDERED", tag, action, round(lo, 1), round(hi, 1))

# the GLB's figure faces -Y (toward a camera at -Y); SW is turned 45 degrees to its right
for tag, facing in [("sw", math.radians(-25)), ("nw", math.radians(-155))]:
    arm.animation_data_create(); arm.animation_data.action = bpy.data.actions["Idle_Loop"]
    h = frame_camera(facing)
    print("VIEW", tag, round(h, 3), round(cam_data.ortho_scale, 3))
    render("Idle_Loop", 4, facing, f"{tag}_idle")
    render("Walk_Loop", 8, facing, f"{tag}_walk")
