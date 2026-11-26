# Headless Blender <-> pxl bridge script.
# Run via: blender --background --python scripts/blender_pxl.py -- --mode <export|import> ...
#
# Modes:
#   --mode export --in scene.blend --out model.glb [--frame N] [--renders dir --pitch 20 --dirs 5 --size 160]
#   --mode import --in model.glb --out scene.blend [--pitch 20]
import math
import os
import sys


def parse_args(argv):
    opts = {}
    i = 0
    while i < len(argv):
        tok = argv[i]
        if tok.startswith("--"):
            key = tok[2:]
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                opts[key] = argv[i + 1]
                i += 2
            else:
                opts[key] = True
                i += 1
        else:
            i += 1
    return opts


def main():
    if "--" not in sys.argv:
        sys.stderr.write("blender_pxl.py: pass script args after '--'\n")
        sys.exit(2)
    args = parse_args(sys.argv[sys.argv.index("--") + 1 :])
    mode = args.get("mode")
    src = args.get("in")
    dst = args.get("out")
    if mode not in ("export", "import") or not src or not dst:
        sys.stderr.write("Usage: blender -b -P scripts/blender_pxl.py -- --mode <export|import> --in <file> --out <file>\n")
        sys.exit(2)

    import bpy
    from mathutils import Euler, Vector

    if mode == "export":
        bpy.ops.wm.open_mainfile(filepath=os.path.abspath(src))
        if "frame" in args:
            bpy.context.scene.frame_set(int(args["frame"]))
        os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
        bpy.ops.export_scene.gltf(
            filepath=os.path.abspath(dst),
            export_format="GLB",
            export_yup=True,
            export_apply=True,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
        )
        # Optional multi-angle orthographic renders aligned to pxl headings (S, SW, W, NW, N, ...)
        renders_dir = args.get("renders")
        if renders_dir:
            os.makedirs(os.path.abspath(renders_dir), exist_ok=True)
            pitch = float(args.get("pitch", 20))
            dirs_n = int(args.get("dirs", 5))
            size = int(args.get("size", 160))
            dir_sets = {
                1: [("s", 180)],
                4: [("s", 180), ("w", 270), ("n", 0), ("e", 90)],
                5: [("s", 180), ("sw", 225), ("w", 270), ("nw", 315), ("n", 0)],
                8: [("s", 180), ("sw", 225), ("w", 270), ("nw", 315), ("n", 0), ("ne", 45), ("e", 90), ("se", 135)],
            }
            views = dir_sets.get(dirs_n, dir_sets[5])
            scene = bpy.context.scene
            # Measure mesh world bounds
            mins = Vector((1e9, 1e9, 1e9))
            maxs = Vector((-1e9, -1e9, -1e9))
            for obj in scene.objects:
                if obj.type != "MESH":
                    continue
                for corner in obj.bound_box:
                    w = obj.matrix_world @ Vector(corner)
                    mins.x, mins.y, mins.z = min(mins.x, w.x), min(mins.y, w.y), min(mins.z, w.z)
                    maxs.x, maxs.y, maxs.z = max(maxs.x, w.x), max(maxs.y, w.y), max(maxs.z, w.z)
            center = (mins + maxs) * 0.5 if mins.x < maxs.x else Vector((0, 0, 0))
            span = max((maxs - mins).length, 1.0) if mins.x < maxs.x else 2.0
            cam_data = bpy.data.cameras.new("PxlOrthoCam")
            cam_data.type = "ORTHO"
            cam_data.ortho_scale = span * 1.1
            cam_obj = bpy.data.objects.new("PxlOrthoCam", cam_data)
            scene.collection.objects.link(cam_obj)
            scene.camera = cam_obj
            scene.render.resolution_x = size
            scene.render.resolution_y = size
            scene.render.resolution_percentage = 100
            scene.render.film_transparent = True
            scene.render.image_settings.file_format = "PNG"
            dist = span * 3.0
            pr = math.radians(pitch)
            for label, heading in views:
                yaw = math.radians(180 - heading)
                # Camera looks along -Z in local coords; place opposite look direction
                fx = math.sin(yaw) * math.cos(pr)
                fy = math.cos(yaw) * math.cos(pr)
                fz = -math.sin(pr)
                cam_obj.location = center - Vector((fx, fy, fz)) * dist
                direction = (center - cam_obj.location).normalized()
                cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
                scene.render.filepath = os.path.join(os.path.abspath(renders_dir), f"{label}.png")
                bpy.ops.render.render(write_still=True)
        return

    # mode == "import": import a pxl .glb into a clean pixel-art-ready .blend file
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
    scene = bpy.context.scene
    pitch = float(args.get("pitch", 20))
    # Set crisp matte material roughness & nearest-neighbor image filtering for pixel-art assets
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                if "Roughness" in node.inputs:
                    node.inputs["Roughness"].default_value = 1.0
                if "Specular IOR Level" in node.inputs:
                    node.inputs["Specular IOR Level"].default_value = 0.0
            elif node.type == "TEX_IMAGE":
                node.interpolation = "Closest"
    # Add orthographic camera matching pxl's default front view at the given pitch
    cam_data = bpy.data.cameras.new("PxlCamera")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 3.0
    cam_obj = bpy.data.objects.new("PxlCamera", cam_data)
    scene.collection.objects.link(cam_obj)
    pr = math.radians(pitch)
    cam_obj.location = Vector((0.0, -5.0 * math.cos(pr), 5.0 * math.sin(pr)))
    cam_obj.rotation_euler = Euler((math.radians(90 - pitch), 0.0, 0.0), "XYZ")
    scene.camera = cam_obj
    # Add upper-left sun matching pxl's default lighting
    light_data = bpy.data.lights.new("PxlSun", type="SUN")
    light_data.energy = 2.5
    light_obj = bpy.data.objects.new("PxlSun", light_data)
    scene.collection.objects.link(light_obj)
    light_obj.rotation_euler = Euler((math.radians(45), math.radians(-25), math.radians(-30)), "XYZ")
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(dst))


if __name__ == "__main__":
    main()
