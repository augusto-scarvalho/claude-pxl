// pxl live viewer. Served type-stripped as /app.js; no imports, no build step.

interface ErrInfo { message: string; loc?: string }
interface AssetInfo { name: string; kind: string; part: boolean; w?: number; h?: number; hash?: string; steps?: number; changed: boolean; edited: boolean; error?: ErrInfo }
interface State { version: number; file: string; time: string; ms: number; error?: ErrInfo; assets: AssetInfo[]; sheets: string[]; errors: ErrInfo[] }
interface FrameJ { label: string; loc?: string; w: number; h: number; full?: string; changes?: string }
interface AssetJ { name: string; kind: string; w: number; h: number; loc?: string; palette: Record<string, string>; layers: string[]; image: string; frames: FrameJ[]; anim?: { ms: number; image: string }[] }
interface Frame { label: string; loc?: string; w: number; h: number; full?: Uint32Array; changes?: Uint32Array }
interface Pic { w: number; h: number; data: Uint32Array }
interface Loaded { j: AssetJ; hash?: string; frames: Frame[]; final: Pic; marks: Map<number, Pic>; rev: Map<number, string>; anim: { ms: number; pic: Pic }[] }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const view = $<HTMLCanvasElement>("view");
const g = view.getContext("2d")!;
const slider = $<HTMLInputElement>("slider");

let state: State | undefined;
let sel: string | undefined;
let cur: Loaded | undefined;
let step = 0;
let playing = false;
let zoom = 0; // 0 = fit
let pan = { x: 0, y: 0 };
let hover: { x: number; y: number } | undefined;
const thumbs = new Map<string, string>(); // name -> hash rendered

// ---------------------------------------------------------------- decoding

function u32(b64: string): Uint32Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Uint32Array(u8.buffer);
}

function toImageData(p: Pic): ImageData {
  const id = new ImageData(p.w, p.h);
  const d = id.data;
  for (let i = 0; i < p.data.length; i++) {
    const c = p.data[i];
    d[i * 4] = c >>> 24; d[i * 4 + 1] = (c >>> 16) & 255; d[i * 4 + 2] = (c >>> 8) & 255; d[i * 4 + 3] = c & 255;
  }
  return id;
}

function hex(c: number): string {
  return "#" + (c >>> 8).toString(16).padStart(6, "0") + ((c & 255) === 255 ? "" : (c & 255).toString(16).padStart(2, "0"));
}

/** Image after step n, rebuilt from the nearest checkpoint. */
function picAt(a: Loaded, n: number): Pic {
  if (!a.frames.length) return a.final;
  n = Math.max(0, Math.min(n, a.frames.length - 1));
  let k = n;
  while (k > 0 && !a.marks.has(k)) k--;
  let pic = a.marks.get(k);
  if (!pic) {
    const f = a.frames[0];
    pic = { w: f.w, h: f.h, data: f.full ? f.full.slice() : new Uint32Array(f.w * f.h) };
    a.marks.set(0, { ...pic, data: pic.data.slice() });
  } else pic = { ...pic, data: pic.data.slice() };
  for (let i = k + 1; i <= n; i++) {
    const f = a.frames[i];
    if (f.full) pic = { w: f.w, h: f.h, data: f.full.slice() };
    else if (f.changes) for (let j = 0; j < f.changes.length; j += 2) pic.data[f.changes[j]] = f.changes[j + 1];
    if (i % 32 === 0 && !a.marks.has(i)) a.marks.set(i, { ...pic, data: pic.data.slice() });
  }
  return pic;
}

// ---------------------------------------------------------------- loading

async function fetchAsset(name: string, frames: boolean): Promise<AssetJ | undefined> {
  const r = await fetch(`/api/asset?name=${encodeURIComponent(name)}&frames=${frames ? 1 : 0}`);
  return r.ok ? (r.json() as Promise<AssetJ>) : undefined;
}

async function select(name: string, opts: { play?: boolean; keepStep?: boolean } = {}): Promise<void> {
  const info = state?.assets.find((a) => a.name === name);
  sel = name;
  localStorage.setItem("pxl.sel", name);
  renderList();
  if (!info || info.error) {
    cur = undefined;
    renderSteps();
    draw();
    return;
  }
  const j = await fetchAsset(name, true);
  if (!j || sel !== name) return;
  const frames: Frame[] = j.frames.map((f) => ({ label: f.label, loc: f.loc, w: f.w, h: f.h, full: f.full ? u32(f.full) : undefined, changes: f.changes ? u32(f.changes) : undefined }));
  const rev = new Map<number, string>();
  for (const [k, v] of Object.entries(j.palette)) {
    const c = parseInt(v.slice(1).padEnd(8, "f"), 16) >>> 0;
    if (!rev.has(c) || /[A-Za-z]/.test(k)) rev.set(c, k);
  }
  const prevStep = step, prevLen = cur?.frames.length ?? 0;
  const anim = (j.anim ?? []).map((f) => ({ ms: f.ms, pic: { w: j.w, h: j.h, data: u32(f.image) } }));
  cur = { j, hash: info.hash, frames, final: { w: j.w, h: j.h, data: u32(j.image) }, marks: new Map(), rev, anim };
  animAt = 0;
  slider.max = String(Math.max(0, frames.length - 1));
  step = opts.play ? 0 : opts.keepStep && prevStep < prevLen - 1 ? Math.min(prevStep, frames.length - 1) : frames.length - 1;
  renderSteps();
  renderPalette();
  setStep(step);
  if (opts.play) play(true);
}

// ---------------------------------------------------------------- list

function renderList(): void {
  const box = $("assets");
  const q = ($<HTMLInputElement>("filter")).value.trim().toLowerCase();
  box.innerHTML = "";
  if (!state) return;
  const groups: [string, AssetInfo[]][] = [
    ["scenes", state.assets.filter((a) => a.kind === "scene")],
    ["anims", state.assets.filter((a) => a.kind === "anim" && !a.part)],
    ["sprites", state.assets.filter((a) => a.kind === "sprite" && !a.part)],
    ["parts", state.assets.filter((a) => a.part)],
  ];
  for (const [title, list] of groups) {
    const shown = list.filter((a) => !q || a.name.toLowerCase().includes(q));
    if (!shown.length) continue;
    const h = document.createElement("div");
    h.className = "sect";
    h.textContent = `${title} · ${shown.length}`;
    box.append(h);
    for (const a of shown) {
      const row = document.createElement("div");
      row.className = "row" + (a.name === sel ? " sel" : "");
      const cv = document.createElement("canvas");
      cv.width = 32; cv.height = 32;
      cv.dataset.name = a.name;
      const meta = document.createElement("div");
      meta.innerHTML = `<div class="nm"></div><div class="sz">${a.error ? "error" : `${a.w}×${a.h} · ${a.steps} steps`}</div>`;
      (meta.firstChild as HTMLElement).textContent = a.name;
      row.append(cv, meta);
      if (a.error || (a.changed && state.version > 1)) {
        const dot = document.createElement("span");
        dot.className = "dot " + (a.error ? "err" : "new");
        row.append(dot);
      }
      row.onclick = () => select(a.name);
      box.append(row);
      paintThumb(cv, a);
    }
  }
}

const thumbCache = new Map<string, Pic>();
async function paintThumb(cv: HTMLCanvasElement, a: AssetInfo): Promise<void> {
  if (a.error || !a.hash) return;
  let pic = thumbs.get(a.name) === a.hash ? thumbCache.get(a.name) : undefined;
  if (!pic) {
    const j = await fetchAsset(a.name, false);
    if (!j) return;
    pic = { w: j.w, h: j.h, data: u32(j.image) };
    thumbs.set(a.name, a.hash);
    thumbCache.set(a.name, pic);
  }
  const off = new OffscreenCanvas(pic.w, pic.h);
  off.getContext("2d")!.putImageData(toImageData(pic), 0, 0);
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const s = Math.min(32 / pic.w, 32 / pic.h);
  const w = pic.w * s, h = pic.h * s;
  c.clearRect(0, 0, 32, 32);
  c.drawImage(off, (32 - w) / 2, (32 - h) / 2, w, h);
}

// ---------------------------------------------------------------- steps panel

function renderSteps(): void {
  const ol = $("steps");
  ol.innerHTML = "";
  if (!cur) return;
  const frag = document.createDocumentFragment();
  cur.frames.forEach((f, i) => {
    const li = document.createElement("li");
    const none = f.changes && f.changes.length === 0;
    li.className = none ? "none" : "";
    li.title = (f.loc ? f.loc + "\n" : "") + f.label + (none ? "\n(no visible change)" : "");
    li.innerHTML = `<span class="i">${i}</span><span class="l"></span>`;
    (li.lastChild as HTMLElement).textContent = f.label;
    li.onclick = () => { play(false); setStep(i); };
    frag.append(li);
  });
  ol.append(frag);
}

function renderPalette(): void {
  const box = $("pal");
  box.innerHTML = "";
  if (!cur) return;
  for (const [k, v] of Object.entries(cur.j.palette)) {
    const s = document.createElement("span");
    s.style.background = v;
    s.textContent = k;
    s.title = `${k} ${v}`;
    box.append(s);
  }
}

function setStep(n: number): void {
  if (!cur) return draw();
  step = Math.max(0, Math.min(n, Math.max(0, cur.frames.length - 1)));
  slider.value = String(step);
  const ol = $("steps");
  ol.querySelector(".cur")?.classList.remove("cur");
  const li = ol.children[step] as HTMLElement | undefined;
  if (li) { li.classList.add("cur"); li.scrollIntoView({ block: "nearest" }); }
  const f = cur.frames[step];
  const info = $("stepinfo");
  info.innerHTML = f
    ? `step <b>${step}</b>/${cur.frames.length - 1} · <b></b> <span style="opacity:.7"></span>`
    : `${cur.j.name} (no steps)`;
  if (f) {
    (info.children[1] as HTMLElement).textContent = f.label;
    (info.children[2] as HTMLElement).textContent = f.loc ? `@ ${f.loc}` : "";
  }
  draw();
}

// ---------------------------------------------------------------- drawing

function draw(): void {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.floor(view.clientWidth * dpr), H = Math.floor(view.clientHeight * dpr);
  if (view.width !== W || view.height !== H) { view.width = W; view.height = H; }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  showError();
  if (!cur) { $("hud").textContent = ""; return; }

  const pic = onFrames() ? cur.anim[animAt].pic : picAt(cur, step);
  const fit = Math.max(1, Math.min(48, Math.floor(Math.min((W - 40) / pic.w, (H - 40) / pic.h))));
  const z = zoom || fit;
  const ox = Math.floor((W - pic.w * z) / 2 + pan.x * dpr), oy = Math.floor((H - pic.h * z) / 2 + pan.y * dpr);

  // checkerboard, one check per pixel
  for (let y = 0; y < pic.h; y++)
    for (let x = 0; x < pic.w; x++) {
      g.fillStyle = (x + y) % 2 ? "#2a2735" : "#33303f";
      g.fillRect(ox + x * z, oy + y * z, z, z);
    }
  g.imageSmoothingEnabled = false;
  // Onion skin: the previous frame tinted red and the next tinted blue, faint, under this one.
  if (onion() && cur.anim.length > 1) {
    const n = cur.anim.length;
    for (const [d, tint] of [[-1, "#ff5a5a"], [1, "#5aa8ff"]] as const) {
      const p = cur.anim[(animAt + d + n) % n].pic, ghost = new OffscreenCanvas(p.w, p.h), gc = ghost.getContext("2d")!;
      gc.putImageData(toImageData(p), 0, 0);
      gc.globalCompositeOperation = "source-atop"; gc.globalAlpha = 0.6; gc.fillStyle = tint; gc.fillRect(0, 0, p.w, p.h);
      g.globalAlpha = 0.35; g.drawImage(ghost, ox, oy, p.w * z, p.h * z); g.globalAlpha = 1;
    }
  }
  const off = new OffscreenCanvas(pic.w, pic.h);
  off.getContext("2d")!.putImageData(toImageData(pic), 0, 0);
  g.drawImage(off, ox, oy, pic.w * z, pic.h * z);

  if (($<HTMLInputElement>("gridtog")).checked && z >= 6) {
    g.beginPath();
    for (let x = 0; x <= pic.w; x++) if (x % 8) { g.moveTo(ox + x * z + 0.5, oy); g.lineTo(ox + x * z + 0.5, oy + pic.h * z); }
    for (let y = 0; y <= pic.h; y++) if (y % 8) { g.moveTo(ox, oy + y * z + 0.5); g.lineTo(ox + pic.w * z, oy + y * z + 0.5); }
    g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 1; g.stroke();
    g.beginPath();
    for (let x = 0; x <= pic.w; x += 8) { g.moveTo(ox + x * z + 0.5, oy); g.lineTo(ox + x * z + 0.5, oy + pic.h * z); }
    for (let y = 0; y <= pic.h; y += 8) { g.moveTo(ox, oy + y * z + 0.5); g.lineTo(ox + pic.w * z, oy + y * z + 0.5); }
    g.strokeStyle = "rgba(0,0,0,.5)"; g.stroke();
  }

  // highlight what the current step changed: tint + bounding box
  const f = cur.frames[step];
  if (($<HTMLInputElement>("hl")).checked && f?.changes && f.changes.length && step < cur.frames.length - 1 + (playing ? 1 : 0)) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    g.fillStyle = "rgba(255,180,84,.42)";
    for (let j = 0; j < f.changes.length; j += 2) {
      const i = f.changes[j], x = i % f.w, y = Math.floor(i / f.w);
      g.fillRect(ox + x * z, oy + y * z, z, z);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    g.strokeStyle = "#ffb454"; g.lineWidth = Math.max(1, dpr);
    g.strokeRect(ox + x0 * z - 1.5, oy + y0 * z - 1.5, (x1 - x0 + 1) * z + 3, (y1 - y0 + 1) * z + 3);
  }

  $("hud").textContent = `${cur.j.kind} ${cur.j.name} · ${pic.w}×${pic.h} · ${z}×${zoom ? "" : " (fit)"}` +
    (cur.anim.length ? ` · frame ${onFrames() ? animAt : 0}/${cur.anim.length - 1}${onion() ? " (onion: , . step)" : ""}` : "");
  inspect(pic, ox, oy, z, dpr);
}

function inspect(pic: Pic, ox: number, oy: number, z: number, dpr: number): void {
  const box = $("inspect");
  if (!hover) { box.textContent = "hover the image"; return; }
  const x = Math.floor((hover.x * dpr - ox) / z), y = Math.floor((hover.y * dpr - oy) / z);
  if (x < 0 || y < 0 || x >= pic.w || y >= pic.h) { box.textContent = "hover the image"; return; }
  const c = pic.data[y * pic.w + x];
  const key = c === 0 ? "." : cur?.rev.get(c) ?? "?";
  box.innerHTML = `<span class="sw"></span><span>x <b>${x}</b> y <b>${y}</b><br>${c === 0 ? "transparent" : hex(c)} · key <b></b></span>`;
  (box.firstChild as HTMLElement).style.background = c === 0 ? "transparent" : hex(c);
  (box.querySelector("b:last-child") as HTMLElement).textContent = key;
}

function showError(): void {
  const el = $("err");
  const info = state?.assets.find((a) => a.name === sel);
  const err = state?.error ?? info?.error ?? (state?.errors.length ? state.errors[0] : undefined);
  el.style.display = err ? "block" : "none";
  if (err) el.textContent = err.message;
}

// ---------------------------------------------------------------- playback

let last = 0, acc = 0;
function play(on: boolean): void {
  playing = on;
  $("play").textContent = on ? "⏸" : "▶";
  if (on && cur && step >= cur.frames.length - 1) setStep(0);
  last = performance.now();
  acc = 0;
  if (on) requestAnimationFrame(tick);
}

function tick(t: number): void {
  if (!playing || !cur) return;
  const sp = ($<HTMLSelectElement>("speed")).value;
  const n = cur.frames.length;
  const rate = sp === "auto" ? Math.max(8, n / 3) : Number(sp); // auto: whole build in ~3s
  acc += ((t - last) / 1000) * rate;
  last = t;
  if (acc >= 1) {
    const adv = Math.floor(acc);
    acc -= adv;
    if (step + adv >= n - 1) { setStep(n - 1); play(false); return; }
    setStep(step + adv);
  }
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- animation
// Animated assets loop through their frames once the painting replay has reached the end.

let animAt = 0, animTimer = 0;
/** Showing anim frames (not painting steps): the replay is done and animate or onion is on. */
function onFrames(): boolean {
  return !!cur && cur.anim.length > 1 && !playing && step >= cur.frames.length - 1 && ($<HTMLInputElement>("animtog").checked || onion());
}
function onion(): boolean {
  return $<HTMLInputElement>("oniontog").checked;
}
/** Frames advance by themselves; onion skin holds still for stepping with , and . */
function animating(): boolean {
  return onFrames() && $<HTMLInputElement>("animtog").checked && !onion();
}

function animTick(): void {
  clearTimeout(animTimer);
  if (animating()) {
    animAt = (animAt + 1) % cur!.anim.length;
    draw();
  }
  const ms = cur?.anim[animAt]?.ms ?? 100;
  animTimer = window.setTimeout(animTick, Math.max(20, ms));
}
animTick();

// ---------------------------------------------------------------- events

function connect(): void {
  const es = new EventSource("/events");
  es.addEventListener("build", (ev) => onBuild(JSON.parse((ev as MessageEvent).data) as State));
  es.onerror = () => { const s = $("status"); s.textContent = "disconnected"; s.className = "pill bad"; };
}

function onBuild(s: State): void {
  const first = !state;
  state = s;
  $("file").textContent = s.file;
  const bad = s.error ? 1 : s.assets.filter((a) => a.error).length + s.errors.length;
  const st = $("status");
  st.textContent = bad ? `${bad} error${bad > 1 ? "s" : ""}` : "ok";
  st.className = "pill " + (bad ? "bad" : "ok");
  $("buildinfo").textContent = `v${s.version} · ${s.ms}ms · ${s.time}`;
  renderList();

  const follow = ($<HTMLInputElement>("follow")).checked;
  const changed = s.assets.filter((a) => a.changed);
  if (first) {
    const want = localStorage.getItem("pxl.sel");
    const pick = s.assets.find((a) => a.name === want) ?? s.assets.find((a) => a.kind === "scene") ?? s.assets.find((a) => !a.part) ?? s.assets[0];
    if (pick) select(pick.name);
    else draw();
    return;
  }
  if (follow && changed.length) {
    // follow what was edited (errors first), else the selected asset, else the first changed one
    const edited = s.assets.filter((a) => a.edited);
    const target = edited.find((a) => a.error) ?? edited.find((a) => a.name === sel) ?? edited.find((a) => !a.part) ?? edited[0]
      ?? changed.find((a) => a.name === sel) ?? changed.find((a) => !a.part) ?? changed[0];
    select(target.name, { play: !target.error });
  } else if (sel) {
    const info = s.assets.find((a) => a.name === sel);
    if (!info) draw();
    else if (info.hash !== cur?.hash || info.error) select(sel, { keepStep: true });
    else draw();
  }
}

slider.oninput = () => { play(false); setStep(Number(slider.value)); };
$("play").onclick = () => play(!playing);
$("first").onclick = () => { play(false); setStep(0); };
$("last").onclick = () => { play(false); setStep(Infinity); };
$("prev").onclick = () => { play(false); setStep(step - 1); };
$("next").onclick = () => { play(false); setStep(step + 1); };
$("filter").oninput = renderList;
for (const id of ["gridtog", "hl", "animtog", "oniontog"]) $(id).onchange = draw;

const stage = $("stage");
stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (!cur) return;
  const dpr = window.devicePixelRatio || 1;
  const pic = picAt(cur, step);
  const fit = Math.max(1, Math.min(48, Math.floor(Math.min((view.width - 40) / pic.w, (view.height - 40) / pic.h))));
  const z = zoom || fit;
  zoom = Math.max(1, Math.min(64, e.deltaY < 0 ? Math.ceil(z * 1.25) : Math.floor(z / 1.25)));
  void dpr;
  draw();
}, { passive: false });
let drag: { x: number; y: number; px: number; py: number } | undefined;
stage.addEventListener("mousedown", (e) => { drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; });
window.addEventListener("mouseup", () => { drag = undefined; });
stage.addEventListener("mousemove", (e) => {
  const r = stage.getBoundingClientRect();
  hover = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (drag) pan = { x: drag.px + e.clientX - drag.x, y: drag.py + e.clientY - drag.y };
  draw();
});
stage.addEventListener("mouseleave", () => { hover = undefined; draw(); });
window.addEventListener("resize", draw);
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).tagName === "INPUT" && (e.target as HTMLInputElement).type === "text") return;
  if (e.key === " ") { e.preventDefault(); play(!playing); }
  else if (e.key === "ArrowLeft") { play(false); setStep(step - 1); }
  else if (e.key === "ArrowRight") { play(false); setStep(step + 1); }
  else if (e.key === "Home") { play(false); setStep(0); }
  else if (e.key === "End") { play(false); setStep(Infinity); }
  else if (e.key === "f") { zoom = 0; pan = { x: 0, y: 0 }; draw(); }
  else if ((e.key === "," || e.key === ".") && cur && cur.anim.length > 1) {
    // Step anim frames (onion skin holds still for this).
    const n = cur.anim.length;
    animAt = (animAt + (e.key === "," ? -1 : 1) + n) % n;
    draw();
  }
  else if (e.key === "g") { const t = $<HTMLInputElement>("gridtog"); t.checked = !t.checked; draw(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const names = [...document.querySelectorAll<HTMLCanvasElement>("#assets canvas")].map((c) => c.dataset.name!);
    const i = names.indexOf(sel ?? "");
    const n = names[Math.max(0, Math.min(names.length - 1, i + (e.key === "ArrowUp" ? -1 : 1)))];
    if (n) select(n);
  }
});

connect();
