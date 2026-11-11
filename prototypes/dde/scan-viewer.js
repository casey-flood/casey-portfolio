import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* ---------- PLY (binary little endian) parser ---------- */
const TYPE_SIZE = { float: 4, float32: 4, double: 8, uchar: 1, uint8: 1, char: 1, int8: 1, short: 2, ushort: 2, int: 4, uint: 4, int32: 4, uint32: 4 };
const S2L = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

function parsePLY(buffer) {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder('windows-1252').decode(bytes.subarray(0, 4096));
  const end = head.indexOf('end_header\n');
  let offset = end + 11;
  const elements = [];
  let cur = null;
  for (const line of head.slice(0, end).split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'element') { cur = { name: p[1], count: +p[2], props: [] }; elements.push(cur); }
    else if (p[0] === 'property' && cur) {
      if (p[1] === 'list') cur.props.push({ list: true, cntType: p[2], valType: p[3], name: p[4] });
      else cur.props.push({ type: p[1], name: p[2] });
    }
  }
  const dv = new DataView(buffer);
  const vEl = elements.find(e => e.name === 'vertex');
  const stride = vEl.props.reduce((s, p) => s + TYPE_SIZE[p.type], 0);
  const off = {}; let acc = 0;
  for (const p of vEl.props) { off[p.name] = acc; acc += TYPE_SIZE[p.type]; }

  const n = vEl.count;
  const position = new Float32Array(n * 3);
  const hasColor = off.red !== undefined;
  const color = hasColor ? new Float32Array(n * 3) : null;
  const hasSeg = off.scan_segmentation !== undefined;
  const seg = hasSeg ? new Uint8Array(n) : null;

  for (let i = 0; i < n; i++) {
    const b = offset + i * stride;
    position[i * 3] = dv.getFloat32(b + off.x, true);
    position[i * 3 + 1] = dv.getFloat32(b + off.y, true);
    position[i * 3 + 2] = dv.getFloat32(b + off.z, true);
    if (hasColor) {
      color[i * 3] = S2L[dv.getUint8(b + off.red)];
      color[i * 3 + 1] = S2L[dv.getUint8(b + off.green)];
      color[i * 3 + 2] = S2L[dv.getUint8(b + off.blue)];
    }
    if (hasSeg) seg[i] = dv.getUint8(b + off.scan_segmentation);
  }
  offset += n * stride;

  const fEl = elements.find(e => e.name === 'face');
  const tri = new Uint32Array(fEl.count * 3 + 64);
  let t = 0;
  for (let f = 0; f < fEl.count; f++) {
    for (const p of fEl.props) {
      const cnt = dv.getUint8(offset); offset += 1;
      if (p.name === 'vertex_indices') {
        const idx = [];
        for (let k = 0; k < cnt; k++) { idx.push(dv.getUint32(offset, true)); offset += 4; }
        for (let k = 2; k < cnt; k++) { tri[t++] = idx[0]; tri[t++] = idx[k - 1]; tri[t++] = idx[k]; }
      } else {
        offset += cnt * TYPE_SIZE[p.valType];
      }
    }
  }
  return { position, color, seg, index: tri.subarray(0, t) };
}

const cache = new Map();
async function loadPLY(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => r.arrayBuffer()).then(parsePLY));
  }
  return cache.get(url);
}

/* ---------- geometry helpers ---------- */
function buildGeometry(ply, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(ply.position, 3));
  if (ply.color) g.setAttribute('color', new THREE.BufferAttribute(ply.color, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  return g;
}

// split face indices into [inside segment, outside segment]
function splitBySegment(ply, unn) {
  const inside = [], outside = [];
  const ix = ply.index, sg = ply.seg;
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i], b = ix[i + 1], c = ix[i + 2];
    if (sg && sg[a] === unn && sg[b] === unn && sg[c] === unn) { inside.push(a, b, c); }
    else outside.push(a, b, c);
  }
  return [new Uint32Array(inside), new Uint32Array(outside)];
}

// boundary edges of a triangle soup == margin line
function boundaryLoop(ply, faceIdx) {
  const map = new Map();
  const key = (a, b) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  for (let i = 0; i < faceIdx.length; i += 3) {
    const t = [faceIdx[i], faceIdx[i + 1], faceIdx[i + 2]];
    for (let e = 0; e < 3; e++) {
      const k = key(t[e], t[(e + 1) % 3]);
      const rec = map.get(k);
      if (rec) rec.n++; else map.set(k, { a: t[e], b: t[(e + 1) % 3], n: 1 });
    }
  }
  const pts = [];
  for (const r of map.values()) {
    if (r.n === 1) {
      pts.push(ply.position[r.a * 3], ply.position[r.a * 3 + 1], ply.position[r.a * 3 + 2]);
      pts.push(ply.position[r.b * 3], ply.position[r.b * 3 + 1], ply.position[r.b * 3 + 2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function segCentroid(ply, unn) {
  const c = new THREE.Vector3(); let n = 0;
  for (let i = 0; i < ply.seg.length; i++) {
    if (ply.seg[i] === unn) { c.x += ply.position[i * 3]; c.y += ply.position[i * 3 + 1]; c.z += ply.position[i * 3 + 2]; n++; }
  }
  return n ? c.divideScalar(n) : c;
}

/* ---------- the element ---------- */
const VIEWS = {
  front:    { d: [0, 0.10, 1],      r: 70, t: 'tooth' },
  occlusal: { d: [0, -1, 0.02],     r: 130, t: 'arch' },
  left:     { d: [-0.85, -0.10, 0.52], r: 66, t: 'tooth' },
  right:    { d: [0.85, -0.10, 0.52],  r: 66, t: 'tooth' },
  lingual:  { d: [0, 0.05, -1],     r: 72, t: 'tooth' },
  quarter:  { d: [0.42, -0.30, 0.86], r: 64, t: 'tooth' },
  side:     { d: [1, 0.02, 0], r: 118, t: 'arch', abs: true },
  poi:      { d: [0, -1, 0.22],     r: 62, t: 'tooth', axis: true },
  closefront: { d: [0, 0.1, 1],     r: 34, t: 'tooth', noFit: true },
  margin:   { d: [0, -1, 0.22],     r: 30, t: 'tooth', axis: true, noFit: true },
  bottom:   { d: [0, 1, 0.02],      r: 130, t: 'arch' },
  facial:   { d: [0, 0.10, 1],      r: 48, t: 'tooth' },
  mesial:   { d: [-1, 0.05, 0.1],   r: 48, t: 'tooth' },
  distal:   { d: [1, 0.05, 0.1],    r: 48, t: 'tooth' },
};

class ScanViewer extends HTMLElement {
  static get observedAttributes() { return ['viz', 'view', 'layers', 'mimic', 'heat', 'focus', 'crowntpl', 'scanstyle', 'background', 'tool', 'brush', 'brushr', 'brushs', 'ghost', 'anchor', 'trimrev', 'trimhide', 'vdo', 'bitex', 'bitez', 'refline', 'refmarkers', 'canvasopacity', 'autoscene', 'generating', 'genprog', 'playkey', 'playmode', 'copyfrom', 'pickteeth']; }

  get scanUrls() {
    return {
      lower: this.getAttribute('opposing') || 'scans/lower.ply',
      bite: this.getAttribute('bite') || 'scans/bite.ply',
    };
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host { display:block; position:absolute; inset:0; overflow:hidden; }
      canvas { display:block; position:absolute; inset:0; width:100%; height:100%; cursor:grab; }
      canvas:active { cursor:grabbing; }
      .status { position:absolute; inset:0; display:grid; place-items:center; font:400 13px/1.5 Inter,sans-serif;
        letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.62); pointer-events:none;
        transition:opacity .4s cubic-bezier(.2,0,0,1); }
      .status[hidden] { opacity:0; display:grid; }
      slot { position:absolute; inset:0; display:block; pointer-events:none; }
      .lassoc { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
      .refc { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
      .whoosh { position:absolute; top:0; bottom:0; left:0; width:26%; pointer-events:none; opacity:0; mix-blend-mode:screen;
        background:linear-gradient(90deg, rgba(110,160,255,0) 0%, rgba(110,160,255,.10) 35%, rgba(130,180,255,.32) 78%, rgba(205,225,255,.85) 99%, rgba(255,255,255,0) 100%); filter:blur(1.5px); }
    </style><canvas></canvas><canvas class="lassoc"></canvas><canvas class="refc"></canvas><div class="whoosh"></div><div class="status">Loading scans</div><slot></slot>`;
    this.canvas = root.querySelector('canvas');
    this.statusEl = root.querySelector('.status');
    this._sph = { theta: 0, phi: 1.2, radius: 70 };
    this._target = new THREE.Vector3();
    this._anchors = [];
    this._ready = false;
  }

  connectedCallback() {
    if (this._init) return;
    this._init = true;
    this._setup();
    this._load();
  }

  disconnectedCallback() { this._stop = true; if (this._ro) this._ro.disconnect(); if (this._kd) { window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku); window.removeEventListener('blur', this._ku); } }

  _setup() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.getAttribute('background') || '#0B1F1B');
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 3000);

    scene.add(new THREE.HemisphereLight(0xe6ece9, 0x2a3733, 1.0));
    const key = new THREE.DirectionalLight(0xfff8f0, 2.0); key.position.set(0.35, -0.55, 1); scene.add(key);
    const fill = new THREE.DirectionalLight(0xeaf1ff, 0.75); fill.position.set(-0.85, 0.25, 0.55); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.28); rim.position.set(0.1, 0.8, -1); scene.add(rim);
    this.headlight = new THREE.DirectionalLight(0xfffaf2, 0.7); scene.add(this.headlight);

    this.rig = new THREE.Group(); scene.add(this.rig);
    this._uRev = { value: 5.0 }; this._uRes = { value: new THREE.Vector2(1, 1) };
    this.whoosh = this.shadowRoot.querySelector('.whoosh');

    // interaction
    this._raycaster = new THREE.Raycaster();
    this._undo = [];
    this._userOffset = new THREE.Vector3();
    let dragging = null, lx = 0, ly = 0;
    this._space = false;
    const typing = e => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
    this._kd = e => { if (e.code !== 'Space' || typing(e)) return; e.preventDefault(); if (!this._space) { this._space = true; if (!dragging) this.canvas.style.cursor = 'grab'; } };
    this._ku = e => { if (e && e.type === 'keyup' && e.code !== 'Space') return; this._space = false; if (!dragging) this.canvas.style.cursor = this.getAttribute('tool') ? 'crosshair' : 'grab'; };
    window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku); window.addEventListener('blur', this._ku);
    const ndc = e => { const r = this.canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    this._pick = e => {
      const tool = this.getAttribute('tool') || '';
      const mesh = (tool === 'trim' || tool === 'trimtooth') ? this.arch : this._em();
      if (!mesh || !mesh.visible) return null;
      this._raycaster.setFromCamera(ndc(e), this.camera);
      const hits = this._raycaster.intersectObject(mesh, false);
      return hits.length ? hits[0] : null;
    };
    const onDown = e => {
      lx = e.clientX; ly = e.clientY; this._downXY = [e.clientX, e.clientY];
      const tool = this.getAttribute('tool') || '';
      if (this._space && e.button === 0) { dragging = 'grab'; this.canvas.style.cursor = 'grabbing'; this.canvas.setPointerCapture(e.pointerId); return; }
      if (!tool && e.button === 0 && !e.shiftKey) { const t = this._refHit(e); if (t) { dragging = t.type; this._refKey = t.key; this.style.cursor = t.type === 'refline' ? 'ns-resize' : 'grabbing'; this.canvas.setPointerCapture(e.pointerId); return; } }
      const hit = tool && tool !== 'trimlasso' && tool !== 'bitemove' && tool !== 'xform' && tool !== 'cutpln' && e.button === 0 && !e.shiftKey ? this._pick(e) : null;
      if (tool === 'bitemove' && e.button === 0 && !e.shiftKey && this.opposing) { dragging = 'bite'; this.style.cursor = 'grabbing'; }
      else if (tool === 'trimlasso' && e.button === 0 && !e.shiftKey) { dragging = 'lasso'; const r = this.canvas.getBoundingClientRect(); this._lasso = [[e.clientX - r.left, e.clientY - r.top]]; }
      else if (tool === 'free' && e.button === 0 && !e.shiftKey) { dragging = 'edit'; this._beginEdit(null, e, tool); }
      else if (hit) { dragging = 'edit'; this._beginEdit(hit, e, tool); }
      else dragging = e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
      this.canvas.setPointerCapture(e.pointerId);
    };
    const onMove = e => {
      if (dragging === 'grab') {
        const gx = e.clientX - lx, gy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        const k = this._perPixel(), right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        const d = right.multiplyScalar(-gx * k).addScaledVector(up, gy * k);
        this._target.add(d); this.camera.position.add(d); this._dirty = true; return;
      }
      if (dragging === 'refline') { const r = this.canvas.getBoundingClientRect(); this._refY = Math.max(0.02, Math.min(0.98, (e.clientY - r.top) / r.height)); return; }
      if (dragging === 'marker') {
        const dx0 = e.clientX - lx, dy0 = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        const k = this._perPixel(), right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        const d = right.multiplyScalar(dx0 * k).addScaledVector(up, -dy0 * k), ov = this._refOv || (this._refOv = new Map());
        ov.set(this._refKey, (ov.get(this._refKey) || new THREE.Vector3()).add(d)); return;
      }
      if (!dragging && !this.getAttribute('tool')) { const t = this._refHit(e); this.style.cursor = t ? (t.type === 'refline' ? 'ns-resize' : 'grab') : ''; }
      if (dragging === 'edit') { this._moveEdit(e); return; }
      if (dragging === 'lasso') { const r = this.canvas.getBoundingClientRect(); this._lasso.push([e.clientX - r.left, e.clientY - r.top]); this._drawLasso(); return; }
      if (!dragging) { if (this.getAttribute('pickteeth')) this._hoverTooth(e); else this._hover(e); return; }
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      if (dragging === 'bite') {
        const k = this._perPixel(), right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        const d = right.multiplyScalar(dx * k).addScaledVector(up, -dy * k);
        this.dispatchEvent(new CustomEvent('bite-drag', { bubbles: true, composed: true, detail: { x: d.x, y: d.y * this._lowDir(), z: d.z } }));
        return;
      }
      if (dragging === 'orbit') {
        this._sph.theta -= dx * 0.007;
        this._sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this._sph.phi - dy * 0.007));
      } else {
        const s = this._sph.radius * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        this._target.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
      }
      this._dirty = true;
    };
    const onUp = e => { if (dragging === 'orbit' && this.getAttribute('pickteeth') && this._downXY && Math.hypot(e.clientX - this._downXY[0], e.clientY - this._downXY[1]) < 5) this._pickTooth(e); if (dragging === 'bite' || dragging === 'marker' || dragging === 'refline') this.style.cursor = ''; if (dragging === 'grab') this.canvas.style.cursor = this._space ? 'grab' : (this.getAttribute('tool') ? 'crosshair' : 'grab'); if (dragging === 'edit') this._endEdit(); if (dragging === 'lasso') { this._trimLasso(); this._lasso = null; this._drawLasso(); } dragging = null; try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) { } };
    { const P = this._tp = new Map(); let st = null, multi = false;
      const mid = () => { const a = [...P.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1 }; };
      this.canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; P.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (P.size === 2) { multi = true; const m = mid(); st = { x: m.x, y: m.y, d: m.d, r: this._sph.radius }; e.stopImmediatePropagation(); } else if (multi) e.stopImmediatePropagation(); }, true);
      this.canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' || !P.has(e.pointerId)) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!multi) return; e.stopImmediatePropagation(); if (P.size < 2 || !st) return;
        const m = mid(), k = this._perPixel(), right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        this._sph.radius = Math.max(8, Math.min(900, st.r * st.d / m.d));
        this._target.addScaledVector(right, -(m.x - st.x) * k).addScaledVector(up, (m.y - st.y) * k); st.x = m.x; st.y = m.y; this._dirty = true; }, true);
      const up = e => { if (e.pointerType !== 'touch') return; P.delete(e.pointerId); if (multi) e.stopImmediatePropagation(); if (!P.size) { multi = false; st = null; } };
      this.canvas.addEventListener('pointerup', up, true); this.canvas.addEventListener('pointercancel', up, true); }
    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);
    this.canvas.addEventListener('pointerleave', () => { if (this.ring) this.ring.visible = false; if (this.hoverHi) this.hoverHi.visible = false; this.style.cursor = ''; });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this._sph.radius = Math.max(14, Math.min(900, this._sph.radius * (1 + Math.sign(e.deltaY) * 0.08)));
      this._dirty = true;
    }, { passive: false });

    this._ro = new ResizeObserver(() => { this._resize(); });
    this._ro.observe(this);
    if (this.parentElement) this._ro.observe(this.parentElement);
    this._resize();
    this._loop();
  }

  _resize() {
    const w = Math.max(1, this.clientWidth || 800);
    const h = Math.max(1, this.clientHeight || 600);
    if (w === this._lastW && h === this._lastH) return;
    this._lastW = w; this._lastH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._dirty = true;
  }

  async _load() {
    const unn = +(this.getAttribute('focus') || 9);
    const prepUrl = this.getAttribute('prep') || 'scans/upper-prep.ply';
    const preopUrl = this.getAttribute('preop') || 'scans/upper-preop.ply';

    const [prep, preop] = await Promise.all([loadPLY(prepUrl), loadPLY(preopUrl)]);

    const [prepSeg, prepRest] = splitBySegment(prep, unn);
    const [preopSeg] = splitBySegment(preop, unn);

    const scanMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.0, side: THREE.DoubleSide });
    const prepMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.02, side: THREE.DoubleSide });

    this._patchReveal(scanMat); this._patchReveal(prepMat);
    this._prepPly = prep; this._focusNum = unn;
    this.arch = new THREE.Mesh(buildGeometry(prep, prepRest), scanMat);
    this.prepTooth = new THREE.Mesh(buildGeometry(prep, prepSeg), prepMat);
    this.rig.add(this.arch, this.prepTooth);

    // proposed restoration = pre-op anatomy of the same tooth (doctor pref: replicate pre-op)
    const restMat = new THREE.MeshPhysicalMaterial({
      color: 0xe4d6bb, roughness: 0.30, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.28,
      sheen: 0.55, sheenColor: new THREE.Color(0xfff4e2), transparent: true, opacity: 0.97,
    });
    const crownUrl = this.getAttribute('crown');
    let restGeo = buildGeometry(preop, preopSeg); this._preopRef = restGeo.attributes.position.array.slice();
    if (crownUrl) { const cp = await loadPLY(crownUrl); this._crownPly = cp; restGeo = buildGeometry(cp, cp.index); }
    this.restoration = new THREE.Mesh(restGeo, restMat);
    this.rig.add(this.restoration);
    this._origPos = this.restoration.geometry.attributes.position.array.slice();
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 56),
      new THREE.MeshBasicMaterial({ color: 0x1ac065, depthTest: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    this.ring.renderOrder = 30; this.ring.visible = false; this.rig.add(this.ring);

    // reference cage: the prep stump sitting inside the crown
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xc7e738, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false });
    this.preopGhost = new THREE.Mesh(buildGeometry(prep, prepSeg), ghostMat);
    this.preopGhost.renderOrder = 8;
    this.rig.add(this.preopGhost);

    // full pre-op arch, as its own toggleable scan
    this.preopArch = new THREE.Mesh(buildGeometry(preop, preop.index), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.58, metalness: 0, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    }));
    this.preopArch.visible = false;
    this.rig.add(this.preopArch);

    // previous attempt: same shape, wrong translucency — rendered flat and opaque
    this.prevAttempt = new THREE.Mesh(buildGeometry(preop, preopSeg), new THREE.MeshStandardMaterial({
      color: 0xfdfdfb, roughness: 0.62, metalness: 0, transparent: true, opacity: 0.92, depthWrite: true,
    }));
    this.prevAttempt.renderOrder = 6;
    this.rig.add(this.prevAttempt);

    // margin line = boundary of the prep segment
    let marginGeo = this._crownPly ? boundaryLoop(this._crownPly, this._crownPly.index) : null;
    if (!marginGeo || !marginGeo.attributes.position || marginGeo.attributes.position.count < 6) marginGeo = boundaryLoop(prep, prepSeg);
    this.margin = new THREE.Group();
    { const ml = new THREE.LineSegments(marginGeo, new THREE.LineDashedMaterial({ color: 0x1ac065, dashSize: 0.32, gapSize: 0.22, depthTest: false, transparent: true, opacity: 1 })); ml.computeLineDistances(); this.margin.add(ml); }
    this.margin.add(new THREE.Points(marginGeo,
      new THREE.PointsMaterial({ color: 0x2fe07d, size: 2.4, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.95 })));
    this.margin.renderOrder = 20;
    this.rig.add(this.margin);

    // insertion axis through the prep centroid
    this.center = this._crownPly ? (() => { const bb = new THREE.Box3().setFromBufferAttribute(this.restoration.geometry.attributes.position); return bb.getCenter(new THREE.Vector3()); })() : segCentroid(prep, unn);
    const axisDir = new THREE.Vector3(0, -1, 0.22).normalize();
    const ap = [this.center.clone().addScaledVector(axisDir, -13), this.center.clone().addScaledVector(axisDir, 17)];
    const ag = new THREE.BufferGeometry().setFromPoints(ap);
    this.axis = new THREE.LineSegments(ag, new THREE.LineDashedMaterial({ color: 0xc7e738, dashSize: 1.1, gapSize: 0.8, transparent: true, opacity: 0.9 }));
    this.axis.computeLineDistances();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.08, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xc7e738, transparent: true, opacity: 0.75, depthTest: false })
    );
    ring.renderOrder = 20;
    ring.position.copy(this.center.clone().addScaledVector(axisDir, 8.5));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisDir);
    this.axis.add(ring);
    this.rig.add(this.axis);

    // opposing and bite load lazily
    this.opposing = null;
    this.bite = null;

    this._baseRestScale = this.restoration.scale.clone();
    this.archCenter = new THREE.Vector3();
    { const bb = new THREE.Box3().setFromObject(this.arch); bb.getCenter(this.archCenter); }
    this._target.copy(this.center);
    this._sph.radius = 64;
    this._ready = true;
    this.statusEl.hidden = true;
    this._lastPlay = null;
    this._applyAttrs();
    this._dirty = true;
    this.dispatchEvent(new CustomEvent('scan-ready', { bubbles: true, composed: true }));
  }

  async _ensureOpposing() {
    if (this.opposing || this._loadingLower) return;
    this._loadingLower = true;
    const ply = await loadPLY(this.scanUrls.lower); this._lowerPly = ply;
    this.opposing = new THREE.Mesh(buildGeometry(ply, ply.index),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
    this._patchReveal(this.opposing.material);
    this.rig.add(this.opposing);
    this._applyAttrs();
    this._dirty = true;
  }

  async _ensureTrimmed() {
    const url = this.getAttribute('trimmed');
    if (!url) return;
    if (this.trimmedGhost) { this.trimmedGhost.visible = true; return; }
    if (this._loadingTrim) return;
    this._loadingTrim = true;
    const ply = await loadPLY(url);
    this.trimmedGhost = new THREE.Mesh(buildGeometry(ply, ply.index), new THREE.MeshStandardMaterial({
      color: 0x9b7bff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, emissive: 0x5a3ec8, emissiveIntensity: 0.45,
    }));
    this.trimmedGhost.renderOrder = 12;
    { // dashed outline along the inner edge of the trimmed band
      const ix = ply.index, ec = new Map(), key = (a, b) => (a < b ? a * 4194304 + b : b * 4194304 + a), pts = [];
      for (let i = 0; i < ix.length; i += 3) for (let k = 0; k < 3; k++) { const a = ix[i + k], b = ix[i + (k + 1) % 3], kk = key(a, b), r = ec.get(kk); if (r) r.n++; else ec.set(kk, { a, b, n: 1 }); }
      ec.forEach(r => { if (r.n === 1 && ply.seg && ply.seg[r.a] >= 165 && ply.seg[r.b] >= 165) pts.push(ply.position[r.a * 3], ply.position[r.a * 3 + 1], ply.position[r.a * 3 + 2], ply.position[r.b * 3], ply.position[r.b * 3 + 1], ply.position[r.b * 3 + 2]); });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.LineSegments(lg, new THREE.LineDashedMaterial({ color: 0xd9c8ff, dashSize: 0.55, gapSize: 0.4, transparent: true, opacity: 0.95, depthTest: false }));
      line.computeLineDistances(); line.renderOrder = 13; this.trimmedGhost.add(line);
      this._prepTrack(line);
    }
    this.rig.add(this.trimmedGhost);
    this._applyAttrs();
  }

  _prepTrack(line) {
    const g = this.trimmedGhost.geometry, ix = g.index.array, p = g.attributes.position.array, F = ix.length / 3, nV = p.length / 3;
    let cx = 0, cz = 0; for (let i = 0; i < p.length; i += 3) { cx += p[i]; cz += p[i + 2]; } cx /= nV; cz /= nV;
    const fc = [];
    for (let f = 0; f < F; f++) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { const vi = ix[f * 3 + k]; x += p[vi * 3]; y += p[vi * 3 + 1]; z += p[vi * 3 + 2]; } x /= 3; y /= 3; z /= 3; fc.push({ f, a: Math.atan2(z - cz, x - cx), x, y, z }); }
    fc.sort((a, b) => a.a - b.a);
    const nix = new Uint32Array(ix.length); this._trimF = new Float32Array(F * 3);
    fc.forEach((o, i) => { nix[i * 3] = ix[o.f * 3]; nix[i * 3 + 1] = ix[o.f * 3 + 1]; nix[i * 3 + 2] = ix[o.f * 3 + 2]; this._trimF[i * 3] = o.x; this._trimF[i * 3 + 1] = o.y; this._trimF[i * 3 + 2] = o.z; });
    g.setIndex(new THREE.BufferAttribute(nix, 1));
    const lp = line.geometry.attributes.position.array, S = lp.length / 6, sg = [];
    for (let s = 0; s < S; s++) { const mx = (lp[s * 6] + lp[s * 6 + 3]) / 2, mz = (lp[s * 6 + 2] + lp[s * 6 + 5]) / 2; sg.push({ s, a: Math.atan2(mz - cz, mx - cx) }); }
    sg.sort((a, b) => a.a - b.a);
    const sp = new Float32Array(lp.length); sg.forEach((o, i) => { for (let k = 0; k < 6; k++) sp[i * 6 + k] = lp[o.s * 6 + k]; });
    line.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); line.computeLineDistances(); this._trimS = S;
    const c = document.createElement('canvas'); c.width = c.height = 64; const x2 = c.getContext('2d'); const gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(210,190,255,.85)'); gr.addColorStop(1, 'rgba(155,123,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    this.trimHead = new THREE.Points(hg, new THREE.PointsMaterial({ size: 46, sizeAttenuation: false, map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.trimHead.renderOrder = 14; this.trimHead.visible = false; this.rig.add(this.trimHead);
  }
  _scanRect(mesh, pad = 0) {
    const W = this.clientWidth || 800, H = this.clientHeight || 600, g = (mesh || this.arch).geometry; if (!g.boundingBox) g.computeBoundingBox();
    if (mesh) { mesh.updateWorldMatrix(true, false); this.camera.updateMatrixWorld(); }
    const b = g.boundingBox, p = new THREE.Vector3(); let l = 1e9, r = -1e9, t = 1e9, bt = -1e9;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { p.set(x, y, z); if (mesh) p.applyMatrix4(mesh.matrixWorld); p.project(this.camera); const px = (p.x * 0.5 + 0.5) * W, py = (-p.y * 0.5 + 0.5) * H; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); bt = Math.max(bt, py); }
    return { l: Math.max(0, l - pad), r: Math.min(W, r + pad), t: Math.max(0, t - pad), b: Math.min(H, bt + pad), W };
  }
  async _ensureBite() {
    if (this.bite || this._loadingBite) return;
    this._loadingBite = true;
    const ply = await loadPLY(this.scanUrls.bite);
    this.bite = new THREE.Mesh(buildGeometry(ply, ply.index),
      new THREE.MeshStandardMaterial({ color: 0x9ab3ad, roughness: 0.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    this.rig.add(this.bite);
    this._applyAttrs();
    this._dirty = true;
  }

  attributeChangedCallback() { if (this._ready) this._applyAttrs(); this._dirty = true; }

  _applyAttrs() {
    if (!this._ready) return;
    const set = new Set((this.getAttribute('layers') || '').split(/\s+/).filter(Boolean));
    this.margin.visible = set.has('margin');
    const dots = set.has('margindots'); this.margin.children.forEach(c => { if (c.isLineSegments) c.visible = !dots; else if (c.isPoints) c.material.size = dots ? 5 : set.has('marginbold') ? 4 : 2.4; });
    this.axis.visible = set.has('axis');
    this.restoration.visible = set.has('restoration');
    this.preopGhost.visible = set.has('stump');
    this.prevAttempt.visible = set.has('previous');
    this.arch.visible = !set.has('hidearch');
    this.prepTooth.visible = !set.has('hideprep') && !set.has('hidearch');
    this.preopArch.visible = set.has('preoparch');
    if (set.has('opposing')) { this._ensureOpposing(); if (this.opposing) this.opposing.visible = true; }
    else if (this.opposing) this.opposing.visible = false;
    if (set.has('bite')) { this._ensureBite(); if (this.bite) this.bite.visible = true; }
    else if (this.bite) this.bite.visible = false;

    const bgAttr = this.getAttribute('background');
    if (bgAttr === 'transparent') { this.scene.background = null; this.renderer.setClearColor(0x000000, 0); }
    else if (bgAttr) { if (!this.scene.background) this.scene.background = new THREE.Color(bgAttr); else this.scene.background.set(bgAttr); }
    { const co = this.getAttribute('canvasopacity'); this.canvas.style.opacity = co === null || co === '' ? '' : co; }
    if (!this.getAttribute('tool') && this.ring) this.ring.visible = false;
    this.canvas.style.cursor = this.getAttribute('tool') === 'free' ? 'grab' : this.getAttribute('tool') && this.getAttribute('tool') !== 'xform' ? 'crosshair' : 'grab';
    const an = this.getAttribute('anchor');
    if (an && an.indexOf('auto') === 0) { this._anchorAuto = an.split(':')[1].split(',').map(Number); this._anchorPt = null; }
    else { this._anchorAuto = null; this._anchorPt = an ? new THREE.Vector3(...an.split(',').map(Number)) : null; }
    this._applyCopyFrom(); this._applyHeat(); this._applyViz();
    if (set.has('trimmed')) this._ensureTrimmed(); else if (this.trimmedGhost) this.trimmedGhost.visible = false;
    if (this.trimmedGhost && this.getAttribute('trimhide')) this.trimmedGhost.visible = false;
    this._syncAutoHide();
    this._applyBiteOffset();
    if (this.trimmedGhost && !this._playing) this.trimmedGhost.material.opacity = this.getAttribute('trimrev') ? 0 : 0.5;
    const br = this.getAttribute('brushr');
    if (br !== this._lastBR) { const first = this._lastBR === undefined; this._lastBR = br; if (!first) this._previewRing(); }
    const pk = this.getAttribute('playkey');
    if (pk && pk !== this._lastPlay) { this._lastPlay = pk; clearTimeout(this._playT); this._playT = setTimeout(() => this.playAutomation(this.getAttribute('playmode') || 'sweep'), 0); }
    this._applyTemplate();
    this._applyScanStyle();
    this._applyGhost();

    const view = this.getAttribute('view');
    if (view && VIEWS[view] && view !== this._lastView) {
      this._lastView = view; this._goView(view);
    }
  }
  _goView(view) {
    const cfg = VIEWS[view]; if (!cfg) return;
    const d = new THREE.Vector3(...cfg.d), ft = this._frontTheta();
    let theta;
    if (cfg.axis) { d.normalize(); if (this.getAttribute('flipy')) d.negate(); theta = Math.atan2(d.x, d.z); }
    else if (!cfg.abs && ft !== null) { theta = ft + Math.atan2(d.x, d.z); d.normalize(); if (this.getAttribute('flipy')) d.y *= -1; }
    else {
      if (!cfg.abs) { d.applyAxisAngle(new THREE.Vector3(0, 1, 0), (+this.getAttribute('yaw') || 0) * Math.PI / 180); if (this.getAttribute('flipy')) d.y *= -1; }
      d.normalize(); theta = Math.atan2(d.x, d.z);
    }
    this._sph.theta = theta;
    this._sph.phi = Math.acos(Math.max(-1, Math.min(1, d.y)));
    this._sph.radius = cfg.r;
    this._target.copy(cfg.t === 'arch' ? this.archCenter : this.center);
    this._dirty = true;
    if (this.getAttribute('autoscene') && this.arch && !cfg.noFit) this._fitAll();
  }
  _fitAll() {
    const W = this.clientWidth || 800, H = this.clientHeight || 600, Hc = H - 56, sph = this._sph, startPos = this.camera.position.clone();
    const meshes = [this.arch, this.prepTooth, this.opposing && this.opposing.visible ? this.opposing : null].filter(Boolean);
    const v = new THREE.Vector3();
    const place = () => { this.camera.position.set(sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta), sph.radius * Math.cos(sph.phi), sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta)).add(this._target); this.camera.lookAt(this._target); this.camera.updateMatrixWorld(); };
    const rect = () => {
      let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
      for (const m of meshes) { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); m.updateWorldMatrix(true, false); const bb = g.boundingBox;
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(m.matrixWorld).project(this.camera); const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H; if (px < l) l = px; if (px > r) r = px; if (py < t) t = py; if (py > b) b = py; } }
      return { cx: (l + r) / 2, cy: (t + b) / 2, w: r - l, h: b - t };
    };
    for (let it = 0; it < 4; it++) {
      place(); const q = rect(); if (!(q.w > 1)) break;
      sph.radius = Math.max(14, Math.min(900, sph.radius * Math.max(q.w / (W * 0.84), q.h / (Hc * 0.8)))); place();
      const q2 = rect(), k = 2 * this.camera.position.distanceTo(this._target) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / H;
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
      this._target.addScaledVector(right, -(W / 2 - q2.cx) * k).addScaledVector(up, (Hc / 2 - q2.cy) * k);
    }
    this.camera.position.copy(startPos); this._dirty = true;
  }
  _genFx() {
    const R0 = this.restoration; if (!R0) return;
    const T = performance.now() / 1000, dt = Math.min(0.1, T - (this._gT || T)); this._gT = T;
    const on = !!this.getAttribute('generating');
    let k = this._gk === undefined ? 1 : this._gk;
    k = on ? Math.max(0, k - 2.5 * dt) : Math.min(1, k + 0.75 * dt); this._gk = k;
    if (on) this._gp = Math.max(0, Math.min(1, +this.getAttribute('genprog') || 0));
    const prog = this._gp || 0, building = on || k < 1, mat = R0.material, E = t => 1 - Math.pow(1 - t, 3);
    if (!building) { if (this._gen && this._gen.group.visible) { this._gen.group.visible = false; if (this._genSave) { mat.opacity = this._genSave.o; mat.transparent = this._genSave.t; mat.depthWrite = this._genSave.d; mat.needsUpdate = true; } this._dirty = true; } return; }
    if (!this._gen) {
      const g = R0.geometry; g.computeBoundingSphere(); const cc = g.boundingSphere.center.clone(), cr = g.boundingSphere.radius, P = g.attributes.position.array, nV = P.length / 3;
      const group = new THREE.Group(), N = 1500, pg = new THREE.BufferGeometry(), tg = new Float32Array(N * 3), off = new Float32Array(N * 3), seed = new Float32Array(N), pa = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const v = (Math.random() * nV) | 0; tg[i * 3] = P[v * 3]; tg[i * 3 + 1] = P[v * 3 + 1]; tg[i * 3 + 2] = P[v * 3 + 2]; const a = Math.random() * 6.2832, b = Math.acos(2 * Math.random() - 1), d = cr * 0.8 * Math.cbrt(Math.random()); off[i * 3] = cc.x + d * Math.sin(b) * Math.cos(a) - tg[i * 3]; off[i * 3 + 1] = cc.y + d * Math.sin(b) * Math.sin(a) - tg[i * 3 + 1]; off[i * 3 + 2] = cc.z + d * Math.cos(b) - tg[i * 3 + 2]; seed[i] = Math.random() * 6.2832; }
      pg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9df5ab, size: 1.6 * Math.min(devicePixelRatio, 2), sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false })); pts.renderOrder = 3; pts.frustumCulled = false; pts.raycast = () => {};
      const bg = new THREE.BufferGeometry(), bp = new Float32Array(P.length); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); if (g.index) bg.setIndex(g.index);
      const dirs = new Float32Array(P.length), sd = new Float32Array(nV); let R = 0;
      for (let i = 0; i < nV; i++) { const dx = P[i * 3] - cc.x, dy = P[i * 3 + 1] - cc.y, dz = P[i * 3 + 2] - cc.z, L = Math.hypot(dx, dy, dz) || 1; dirs[i * 3] = dx / L; dirs[i * 3 + 1] = dy / L; dirs[i * 3 + 2] = dz / L; sd[i] = P[i * 3] * 0.9 + P[i * 3 + 1] * 1.3 + P[i * 3 + 2] * 0.7; R += L; }
      R = (R / nV) * 0.92;
      const blob = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: 0xc9f7d1, emissive: 0x158915, emissiveIntensity: 0.35, roughness: 0.35, flatShading: true, transparent: true, side: THREE.DoubleSide, depthWrite: false })); blob.renderOrder = 3; blob.frustumCulled = false; blob.raycast = () => {};
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: 0x9df5ab, transparent: true, depthTest: false, depthWrite: false })); halo.renderOrder = 2; halo.position.copy(cc); halo.scale.setScalar(cr * 2.1); halo.raycast = () => {};
      group.add(blob, pts, halo); group.matrixAutoUpdate = true; this.rig.add(group);
      this._gen = { group, pts, blob, halo, tg, off, seed, pa, dirs, sd, bp, P, cc, cr, R, N };
    }
    const G = this._gen; G.group.visible = true; G.group.position.copy(R0.position); G.group.quaternion.copy(R0.quaternion); G.group.scale.copy(R0.scale);
    if (!this._genSave) this._genSave = { o: mat.opacity, t: mat.transparent, d: mat.depthWrite };
    const co = E(Math.max(0, (k - 0.25) / 0.75)); mat.transparent = true; mat.opacity = co; mat.depthWrite = co > 0.9; mat.needsUpdate = true;
    const spread = (1 - E(Math.max(prog, k))) * (1 - k), jm = G.cr * 0.012 * (1 - k), pa = G.pa;
    for (let i = 0; i < G.N; i++) { const sd = G.seed[i]; pa[i * 3] = G.tg[i * 3] + G.off[i * 3] * spread + Math.sin(T * 2.1 + sd) * jm; pa[i * 3 + 1] = G.tg[i * 3 + 1] + G.off[i * 3 + 1] * spread + Math.cos(T * 1.7 + sd) * jm; pa[i * 3 + 2] = G.tg[i * 3 + 2] + G.off[i * 3 + 2] * spread + Math.sin(T * 1.3 + 2 * sd) * jm; }
    G.pts.geometry.attributes.position.needsUpdate = true; G.pts.material.opacity = 0.85 * (1 - E(Math.max(0, (k - 0.35) / 0.65)));
    const mm = E(Math.min(1, prog * 1.05)), amp = G.cr * 0.07 * (1 - mm) + G.cr * 0.012, bp = G.bp, nV = G.P.length / 3;
    for (let i = 0; i < nV; i++) { const dx = G.dirs[i * 3], dy = G.dirs[i * 3 + 1], dz = G.dirs[i * 3 + 2], sdv = G.sd[i], w = (0.6 * Math.sin(2.2 * T + 0.35 * sdv) + 0.4 * Math.sin(1.3 * T + 0.8 * sdv)) * amp;
      for (let a = 0; a < 3; a++) { const dir = a === 0 ? dx : a === 1 ? dy : dz, sph = G.cc.getComponent(a) + dir * G.R, real = G.P[i * 3 + a]; bp[i * 3 + a] = sph + (real - sph) * mm + dir * w; } }
    G.blob.geometry.attributes.position.needsUpdate = true; const bo = (0.16 + 0.26 * E(prog)) * (1 - E(k)); G.blob.material.opacity = bo; G.blob.visible = bo > 0.01;
    G.halo.material.opacity = (0.4 + 0.1 * Math.sin(2.4 * T)) * (1 - k); this._dirty = true;
  }
  _mimicFx() {
    const R0 = this.restoration; if (!R0 || !this._ready || !this._prepPly) return;
    const sp = (this.getAttribute('mimic') || '').split(':'), mode = sp[0], n = +sp[1] || 0, key = (mode === 'mirror' || mode === 'adjacent') && n ? mode + ':' + n : '';
    if (key !== this._mmKey) {
      this._mmKey = key; this._mmT0 = performance.now(); if (this._mm) this._mm.visible = false;
      if (key) {
        const g0 = this._toothGeo(n);
        if (!g0) { this._mmKey = ''; return; }
        const ix = g0.index ? g0.index.array : null, P = g0.attributes.position.array, bb = new THREE.Box3(), t3 = new THREE.Vector3();
        if (ix) for (let i = 0; i < ix.length; i++) bb.expandByPoint(t3.set(P[ix[i] * 3], P[ix[i] * 3 + 1], P[ix[i] * 3 + 2])); else bb.setFromBufferAttribute(g0.attributes.position);
        this._mmC = bb.getCenter(new THREE.Vector3()); this._mmSize = bb.getSize(new THREE.Vector3());
        if (!R0.geometry.boundingBox) R0.geometry.computeBoundingBox();
        const g = R0.geometry.clone(), cb = R0.geometry.boundingBox; this._mmGC = cb.getCenter(new THREE.Vector3()); this._mmGSize = cb.getSize(new THREE.Vector3());
        g.translate(-this._mmGC.x, -this._mmGC.y, -this._mmGC.z);
        if (!this._mm) { this._mm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc9f7d1, emissive: 0x158915, emissiveIntensity: 0.35, roughness: 0.4, flatShading: true, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); this._mm.renderOrder = 15; this._mm.frustumCulled = false; this._mm.raycast = () => {}; this.rig.add(this._mm); }
        else { this._mm.geometry.dispose(); this._mm.geometry = g; }
      }
    }
    if (!this._mmKey || !this._mm) return;
    const ct = this._mmGC.clone().multiply(R0.scale).add(R0.position);
    const k0 = Math.max(0.75, Math.min(1.25, this._mmSize.x / (this._mmGSize.x * R0.scale.x || 1))), mir = this._mmKey.indexOf('mirror') === 0;
    const v0 = mir ? [0.96, 1.04, 0.97] : [1.07, 1.0, 0.94];
    const p = ((performance.now() - this._mmT0) % 4200) / 4200; let e, op;
    if (p < 0.2) { e = 0; op = 0.75 * (p / 0.2); } else if (p < 0.7) { const k = (p - 0.2) / 0.5; e = k * k * (3 - 2 * k); op = 0.75; } else if (p < 0.88) { e = 1; op = 0.75 - 0.4 * ((p - 0.7) / 0.18); } else { e = 1; op = 0.35 * (1 - (p - 0.88) / 0.12); }
    const m = this._mm, c0 = this._mmC;
    m.position.set(c0.x + (ct.x - c0.x) * e, c0.y + (ct.y - c0.y) * e, c0.z + (ct.z - c0.z) * e);
    const f = (a, b) => a + (b - a) * e, sx = f(k0 * v0[0], 1), sy = f(k0 * v0[1], 1), sz = f(k0 * v0[2], 1);
    m.scale.set(R0.scale.x * (mir ? sx * Math.cos(Math.PI * e) : sx), R0.scale.y * sy, R0.scale.z * sz);
    m.material.opacity = op; m.visible = op > 0.01; this._dirty = true;
  }
  autoCej() {
    const em = this.restoration; if (!em) return false;
    const g = em.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3;
    em.updateWorldMatrix(true, false);
    let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9; for (let i = 0; i < n; i++) { const y = P[i * 3 + 1], x = P[i * 3]; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const lo = y0 + (y1 - y0) * 0.12, hi = y0 + (y1 - y0) * 0.3, B = 9, bins = Array.from({ length: B }, () => ({ s: new THREE.Vector3(), c: 0 })), cam = this.camera.position, wp = new THREE.Vector3(), wn = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const y = P[i * 3 + 1]; if (y < lo || y > hi) continue;
      wp.set(P[i * 3], y, P[i * 3 + 2]).applyMatrix4(em.matrixWorld); wn.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]).transformDirection(em.matrixWorld);
      if (wn.dot(cam.clone().sub(wp).normalize()) < 0.25) continue;
      const b = Math.min(B - 1, Math.floor(((P[i * 3] - x0) / ((x1 - x0) || 1)) * B)); bins[b].s.add(new THREE.Vector3(P[i * 3], y, P[i * 3 + 2])); bins[b].c++;
    }
    const pts = bins.filter(b => b.c > 3).map(b => b.s.multiplyScalar(1 / b.c));
    if (pts.length < 3) return false;
    this._cej = pts; this._cejBase = null; this._dirty = true; this.dispatchEvent(new CustomEvent('cej-curve', { bubbles: true, composed: true, detail: true })); return true;
  }
  cejGenerate(depth, smooth, width) {
    const em = this.restoration, C = this._cej; if (!em || !C || C.length < 2) return false;
    const a = em.geometry.attributes.position.array, nm = em.geometry.attributes.normal.array;
    if (!this._cejBase) { this._pushUndo(); this._cejBase = { orig: a.slice(), norm: nm.slice() }; }
    const { orig, norm } = this._cejBase, ex = 2.6 - 1.8 * smooth, p = new THREE.Vector3(), q = new THREE.Vector3(), ab = new THREE.Vector3();
    for (let i = 0, n = a.length / 3; i < n; i++) {
      p.set(orig[i * 3], orig[i * 3 + 1], orig[i * 3 + 2]); let d = 1e9;
      for (let k = 0; k < C.length - 1; k++) { ab.copy(C[k + 1]).sub(C[k]); const t = Math.max(0, Math.min(1, p.clone().sub(C[k]).dot(ab) / (ab.lengthSq() || 1))); d = Math.min(d, p.distanceTo(q.copy(C[k]).addScaledVector(ab, t))); }
      const f = d >= width ? 0 : Math.pow(1 - d / width, ex);
      a[i * 3] = orig[i * 3] + norm[i * 3] * depth * f; a[i * 3 + 1] = orig[i * 3 + 1] + norm[i * 3 + 1] * depth * f; a[i * 3 + 2] = orig[i * 3 + 2] + norm[i * 3 + 2] * depth * f;
    }
    this._refreshMesh(em); this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); return true;
  }
  resetCej() {
    const em = this.restoration; if (this._cejBase && em) { em.geometry.attributes.position.array.set(this._cejBase.orig); this._refreshMesh(em); }
    this._cej = null; this._cejBase = null; this._metrics(); this.dispatchEvent(new CustomEvent('cej-curve', { bubbles: true, composed: true, detail: false }));
  }
  _grid(mesh, key) {
    mesh.updateWorldMatrix(true, false);
    const k = key + mesh.matrixWorld.elements.join(',') + mesh.geometry.attributes.position.count; this._grids = this._grids || {};
    if (this._grids[key] && this._grids[key].k === k) return this._grids[key];
    const C = 2, P = mesh.geometry.attributes.position, v = new THREE.Vector3(), m = new Map();
    for (let i = 0; i < P.count; i += 5) { v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld); const id = Math.floor(v.x / C) + ',' + Math.floor(v.y / C) + ',' + Math.floor(v.z / C); let a = m.get(id); if (!a) m.set(id, a = []); a.push(v.x, v.y, v.z); }
    return (this._grids[key] = { k, m, C });
  }
  _gridD(G, v) {
    const C = G.C, cx = Math.floor(v.x / C), cy = Math.floor(v.y / C), cz = Math.floor(v.z / C); let best = 1e9;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) { const a = G.m.get((cx + x) + ',' + (cy + y) + ',' + (cz + z)); if (!a) continue; for (let i = 0; i < a.length; i += 3) { const d = Math.hypot(a[i] - v.x, a[i + 1] - v.y, a[i + 2] - v.z); if (d < best) best = d; } }
    return best;
  }
  _needOpp() { if (this._oppWait || this.opposing || this._oppTried) return; this._oppTried = true; this._oppWait = true; Promise.resolve(this._ensureOpposing()).then(() => { this._oppWait = false; if (this.opposing) this.opposing.visible = false; this._applyHeat(); this._applyViz(); }); }
  _applyDistHeat(kind) {
    const em = this.restoration; if (!em) return; const src = kind === 'occlusal' ? this.opposing : this.arch;
    if (!src) { this._needOpp(); return; }
    const g = em.geometry; let col = g.attributes.color; if (!col) { col = new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3); g.setAttribute('color', col); }
    if (!this._col0) this._col0 = col.array.slice();
    if (!em.material.vertexColors) { em.material.vertexColors = true; em.material.needsUpdate = true; }
    em.updateWorldMatrix(true, false); const G = this._grid(src, kind), P = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) { if (i % 3 === 0) { v.fromBufferAttribute(P, i).applyMatrix4(em.matrixWorld); const d = this._gridD(G, v), t = Math.min(1, d / 2); c.setHSL(0.62 * t, 0.9, 0.5); } col.array[i * 3] = c.r; col.array[i * 3 + 1] = c.g; col.array[i * 3 + 2] = c.b; }
    col.needsUpdate = true; this._heatOn = true; this._dirty = true;
  }
  _applyViz() {
    const set = new Set((this.getAttribute('viz') || '').split(/\s+/).filter(Boolean)); this._vz = set;
    if (!this._ready) return;
    const em = this.restoration;
    if (set.has('collisions') && em && this.arch) {
      if (!this.opposing) this._needOpp();
      const GA = this._grid(this.arch, 'arch'), GO = this.opposing ? this._grid(this.opposing, 'occlusal') : null, P = em.geometry.attributes.position, v = new THREE.Vector3(), out = [];
      em.updateWorldMatrix(true, false);
      for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(em.matrixWorld); if ((GO && this._gridD(GO, v) < 0.12) || this._gridD(GA, v) < 0.06) out.push(v.x, v.y, v.z); }
      if (!this._coll) { this._coll = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff2d55, size: 6, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.95 })); this._coll.renderOrder = 22; this._coll.frustumCulled = false; this.scene.add(this._coll); }
      this._coll.geometry.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); this._coll.visible = out.length > 0; this._collN = out.length / 3;
      this.dispatchEvent(new CustomEvent('collisions', { bubbles: true, composed: true, detail: this._collN }));
    } else if (this._coll) this._coll.visible = false;
    if (!this._mcl) { this._mcl = e => {
      if (!this._vz || !this._vz.has('measure') || this._space || !this._downXY || Math.hypot(e.clientX - this._downXY[0], e.clientY - this._downXY[1]) > 5) return;
      const r = this.canvas.getBoundingClientRect(); this._raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
      const hit = this._raycaster.intersectObjects([this.restoration, this.arch, this.prepTooth].filter(m => m && m.visible), false)[0]; if (!hit) return;
      this._mpts = this._mpts && this._mpts.length === 1 ? [this._mpts[0], hit.point.clone()] : [hit.point.clone()]; this._dirty = true;
    }; this.canvas.addEventListener('pointerup', this._mcl); }
    if (!set.has('measure')) this._mpts = null;
    this._dirty = true;
  }
  _vizFrame() {
    const on = this._vz && this._vz.has('section');
    if (on) { const d = this.camera.getWorldDirection(new THREE.Vector3()); this._secPl = this._secPl || new THREE.Plane(); this._secPl.setFromNormalAndCoplanarPoint(d, this._target.clone().addScaledVector(d, +(this.getAttribute('secoff') || 0))); this.renderer.clippingPlanes = [this._secPl]; }
    else if (this.renderer.clippingPlanes && this.renderer.clippingPlanes.length) this.renderer.clippingPlanes = [];
    if (this._coll && this._coll.visible && this._vz && !this._vz.has('collisions')) this._coll.visible = false;
  }
  _vizOverlay() {
    const pts = this._mpts; if (!this._msSvg) { if (!pts) return; const s = this._msSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible'; s.innerHTML = '<line stroke="#C7E738" stroke-width="2" stroke-dasharray="5 4"/><circle r="4.5" fill="#C7E738" stroke="#04120F" stroke-width="1.5"/><circle r="4.5" fill="#C7E738" stroke="#04120F" stroke-width="1.5"/><g><rect rx="6" height="22" fill="#04120F" fill-opacity=".85" stroke="#C7E738"/><text font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="#C7E738" dominant-baseline="middle"></text></g>'; this.shadowRoot.appendChild(s); }
    const S = this._msSvg; if (!pts) { S.style.display = 'none'; return; } S.style.display = '';
    const W = this.clientWidth, H = this.clientHeight, pr = pts.map(p => { const q = p.clone().project(this.camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; });
    const ln = S.querySelector('line'), cs = S.querySelectorAll('circle'), g = S.querySelector('g'), tx = g.querySelector('text'), rc = g.querySelector('rect');
    cs[0].setAttribute('cx', pr[0][0]); cs[0].setAttribute('cy', pr[0][1]);
    if (pr[1]) { ln.style.display = ''; ln.setAttribute('x1', pr[0][0]); ln.setAttribute('y1', pr[0][1]); ln.setAttribute('x2', pr[1][0]); ln.setAttribute('y2', pr[1][1]); cs[1].style.display = ''; cs[1].setAttribute('cx', pr[1][0]); cs[1].setAttribute('cy', pr[1][1]);
      const mm = pts[0].distanceTo(pts[1]).toFixed(2) + ' mm'; tx.textContent = mm; const mx = (pr[0][0] + pr[1][0]) / 2, my = (pr[0][1] + pr[1][1]) / 2, w = mm.length * 7.6 + 16; rc.setAttribute('width', w); rc.setAttribute('x', mx - w / 2); rc.setAttribute('y', my - 28); tx.setAttribute('x', mx - w / 2 + 8); tx.setAttribute('y', my - 17); g.style.display = ''; }
    else { ln.style.display = 'none'; cs[1].style.display = 'none'; g.style.display = 'none'; }
  }
  _applyHeat() {
    { const hk = this.getAttribute('heat'); if (hk === 'occlusal' || hk === 'proximal') { this._applyDistHeat(hk); return; } }
    if (this.getAttribute('heat') === 'thickness') { this._applyThickHeat(); return; }
    const em = this.restoration; if (!em) return; const want = this.getAttribute('heat') === 'gingiva';
    const g = em.geometry; let col = g.attributes.color;
    if (!col) { if (!want) return; const nn = g.attributes.position.count; col = new THREE.BufferAttribute(new Float32Array(nn * 3).fill(1), 3); g.setAttribute('color', col); }
    if (!this._col0) this._col0 = col.array.slice();
    if (em.material.vertexColors !== want && (want || this._heatOn)) { em.material.vertexColors = want; em.material.needsUpdate = true; }
    if (!want) { if (this._heatOn) { col.array.set(this._col0); col.needsUpdate = true; this._heatOn = false; this._dirty = true; } return; }
    this._heatOn = true;
    const P = g.attributes.position.array, N = g.attributes.normal.array, O = this._orig(em), n = P.length / 3, c = col.array;
    let y0 = 1e9, y1 = -1e9; for (let i = 0; i < n; i++) { const y = O[i * 3 + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cut = y0 + (y1 - y0) * 0.38, G = [0.42, 0.84, 0.56], Y = [0.98, 0.84, 0.25], R = [0.9, 0.2, 0.16], mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < n; i++) {
      const o = this._col0, gray = (o[i * 3] + o[i * 3 + 1] + o[i * 3 + 2]) / 3 * 0.75 + 0.1;
      if (O[i * 3 + 1] > cut) { c[i * 3] = gray; c[i * 3 + 1] = gray; c[i * 3 + 2] = gray; continue; }
      const sg = (P[i * 3] - O[i * 3]) * N[i * 3] + (P[i * 3 + 1] - O[i * 3 + 1]) * N[i * 3 + 1] + (P[i * 3 + 2] - O[i * 3 + 2]) * N[i * 3 + 2], t = Math.max(0, Math.min(1, sg / 0.6)), k = t < 0.5 ? mix(G, Y, t * 2) : mix(Y, R, (t - 0.5) * 2);
      c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2];
    }
    col.needsUpdate = true; this._dirty = true;
  }
  _mcTick() {
    if (!this.restoration || !this.margin) return;
    if (this._freeOff && this.getAttribute('marginconn') !== '0' && !(this._edit && this._edit.mode === 'free')) { const f = this._freeOff, s = f.length() < 0.01 ? f.clone() : f.clone().multiplyScalar(0.14); this.restoration.position.sub(s); f.sub(s); this._dirty = true; if (f.length() < 0.001) this._freeOff = null; }
    const t = this.getAttribute('marginconn') === '0' ? 1 : 0, cur = this._mcCur || 0, nx = Math.abs(t - cur) < 0.003 ? t : cur + (t - cur) * 0.14;
    if (nx !== cur) { this.restoration.position.y += (nx - cur) * 1.1; this._mcCur = nx; this._dirty = true; }
    const col = t ? 0xf2b63c : 0x1ac065; this.margin.children.forEach(c => c.material.color.setHex(col));
  }
  _mInit() {
    const g = this.margin.children[0].geometry, A = g.attributes.position.array, n = A.length / 6, k = (i) => A[i * 3].toFixed(3) + '|' + A[i * 3 + 1].toFixed(3) + '|' + A[i * 3 + 2].toFixed(3), adj = new Map();
    for (let s = 0; s < n; s++) { const a = k(s * 2), b = k(s * 2 + 1), pa = [A[s * 6], A[s * 6 + 1], A[s * 6 + 2]]; if (!adj.has(a)) adj.set(a, { p: pa, n: [] }); if (!adj.has(b)) adj.set(b, { p: [A[s * 6 + 3], A[s * 6 + 4], A[s * 6 + 5]], n: [] }); adj.get(a).n.push(b); adj.get(b).n.push(a); }
    const seen = new Set(), loops = [];
    for (const key of adj.keys()) { if (seen.has(key)) continue; const L = []; let cur = key, prev = null; while (cur && !seen.has(cur)) { seen.add(cur); L.push(new THREE.Vector3(...adj.get(cur).p)); const nx = adj.get(cur).n.find(x => x !== prev && !seen.has(x)); prev = cur; cur = nx; } loops.push(L); }
    loops.sort((a, b) => b.length - a.length); this._mLoop = loops[0] || [];
    const N = this._mLoop.length, H = Math.min(10, N); this._mH = Array.from({ length: H }, (_, i) => Math.floor(i * N / H)); this._mStep = N / H;
  }
  _mWrite() {
    const L = this._mLoop, N = L.length, arr = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const a = L[i], b = L[(i + 1) % N]; arr.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); }
    const g = this.margin.children[0].geometry; g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); this.margin.children.forEach(c => { if (c.isLineSegments) c.computeLineDistances(); }); this._dirty = true;
  }
  _mUpdate() {
    const on = (this.getAttribute('layers') || '').includes('marginbold') && this._ready && this.margin;
    if (!on) { if (this._mSvg) this._mSvg.style.display = 'none'; return; }
    if (!this._mLoop) this._mInit();
    this.margin.visible = false;
    if (!this._mSvg) {
      const s = this._mSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:visible';
      s.innerHTML = '<path class="u" fill="none" stroke="rgba(0,20,14,.55)" stroke-width="3" stroke-linejoin="round"/><path class="l" fill="none" stroke-width="1.5" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round"/><g class="h"></g>';
      this.appendChild(s);
      s.addEventListener('pointerdown', (e) => { const c = e.target.closest('circle'); if (!c) return; e.preventDefault(); e.stopPropagation(); const hi = +c.getAttribute('data-i'), idx = this._mH[hi]; const rm = this.restoration; let rb = null, ymin = 0, yr = 1; if (rm) { this._orig(rm); this._pushUndo(); const P = rm.geometry.attributes.position.array; rb = P.slice(); let y0 = 1e9, y1 = -1e9; for (let i = 1; i < P.length; i += 3) { if (P[i] < y0) y0 = P[i]; if (P[i] > y1) y1 = P[i]; } ymin = y0; yr = (y1 - y0) || 1; }
        this._mDrag = { hi, idx, orig: this._mLoop.map(p => p.clone()), h0: this._mLoop[idx].clone(), rb, ymin, yr }; s.setPointerCapture && s.setPointerCapture(e.pointerId); });
      s.addEventListener('pointermove', (e) => this._mMove(e));
      const up = (e) => { if (this._mDrag) { const moved = !!this._mDrag.rb; this._mDrag = null; if (moved) { this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); } this.dispatchEvent(new CustomEvent('margin-edit', { bubbles: true, composed: true })); } };
      s.addEventListener('pointerup', up); s.addEventListener('pointercancel', up);
    }
    const S = this._mSvg; S.style.display = '';
    const W = this.clientWidth, H = this.clientHeight, L = this._mLoop, N = L.length, col = this.getAttribute('marginconn') === '0' ? '#F2B63C' : '#2FE07D', v3 = new THREE.Vector3();
    const proj = (p) => { v3.copy(p); this.rig.localToWorld(v3); v3.project(this.camera); return [(v3.x * 0.5 + 0.5) * W, (-v3.y * 0.5 + 0.5) * H]; };
    const st = Math.max(1, Math.floor(N / 160)); let d = '';
    for (let i = 0; i < N; i += st) { const q = proj(L[i]); d += (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); } d += 'Z';
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; this._mH.forEach(idx => { const q = proj(L[idx]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    const sc = Math.max(0.5, Math.min(1.25, Math.hypot(x1 - x0, y1 - y0) / 420)), u = S.querySelector('.u'), l = S.querySelector('.l');
    u.setAttribute('d', d); u.setAttribute('stroke-width', (3.2 * sc).toFixed(2)); l.setAttribute('d', d); l.setAttribute('stroke', col); l.setAttribute('stroke-width', (1.5 * sc).toFixed(2)); l.setAttribute('stroke-dasharray', (6 * sc).toFixed(1) + ' ' + (5 * sc).toFixed(1));
    const hg = S.querySelector('.h'); if (hg.childElementCount !== this._mH.length) hg.innerHTML = this._mH.map((_, i) => '<circle data-i="' + i + '" r="4.6" stroke-width="1.6" style="pointer-events:all;cursor:grab"/>').join('');
    this._mH.forEach((idx, i) => { const q = proj(L[idx]), c = hg.children[i]; c.setAttribute('cx', q[0]); c.setAttribute('cy', q[1]); c.setAttribute('r', (4.6 * sc).toFixed(2)); c.setAttribute('stroke-width', (1.6 * sc).toFixed(2)); c.setAttribute('fill', '#fff'); c.setAttribute('stroke', col); });
  }
  _mMove(e) {
    const D = this._mDrag; if (!D) return;
    const r = this.canvas.getBoundingClientRect(), nd = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(nd, this.camera);
    const hw = D.h0.clone(); this.rig.localToWorld(hw);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()), hw), hit = new THREE.Vector3();
    if (!rc.ray.intersectPlane(pl, hit)) return;
    const dl = this.rig.worldToLocal(hit).sub(D.h0), N = this._mLoop.length, R = this._mStep * 1.3;
    for (let j = 0; j < N; j++) { let k = Math.abs(j - D.idx); k = Math.min(k, N - k); const t = k >= R ? 0 : 1 - k / R, w = t * t * (3 - 2 * t); this._mLoop[j].copy(D.orig[j]).addScaledVector(dl, w); }
    this._mWrite();
    const rm = this.restoration;
    if (rm && D.rb) {
      const P = rm.geometry.attributes.position.array, B = D.rb, rp = rm.position, hx = D.h0.x - rp.x, hy = D.h0.y - rp.y, hz = D.h0.z - rp.z, hh = this._mH, R2 = this._mLoop[hh[0]].distanceTo(this._mLoop[hh[1] || 0]) * 1.1 || 2;
      for (let i = 0, n = P.length / 3; i < n; i++) {
        const x = B[i * 3], y = B[i * 3 + 1], z = B[i * 3 + 2], dd = Math.hypot(x - hx, y - hy, z - hz);
        let w = 0; if (dd < R2) { const t = 1 - dd / R2; w = t * t * (3 - 2 * t); }
        P[i * 3] = x + dl.x * w; P[i * 3 + 1] = y + dl.y * w; P[i * 3 + 2] = z + dl.z * w;
      }
      this._refreshMesh(rm);
    }
  }
  _cutNormal() {
    const C = this._cut, em = this.restoration; em.updateWorldMatrix(true, false);
    const dir = this.camera.getWorldDirection(new THREE.Vector3()).transformDirection(new THREE.Matrix4().copy(em.matrixWorld).invert());
    const n = new THREE.Vector3().subVectors(C.b, C.a).cross(dir).normalize(); if (n.lengthSq() < 0.5) return; if (C.n.dot(n) < 0) n.negate(); C.n.copy(n);
  }
  _cutInit() {
    const em = this.restoration; if (!em.geometry.boundingBox) em.geometry.computeBoundingBox();
    const bb = em.geometry.boundingBox, c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
    this._cut = { a: new THREE.Vector3(c.x - sz.x * 0.62, c.y + sz.y * 0.12, c.z), b: new THREE.Vector3(c.x + sz.x * 0.62, c.y + sz.y * 0.08, c.z), flip: 1, n: new THREE.Vector3(0, 1, 0), depth: 0 };
    this._cutNormal();
  }
  morphOppose(limit, pres, minThk) {
    const em = this.restoration; if (!em) return -1;
    const cloud = this._cloud('opposing', em); if (!cloud) return -1;
    this._orig(em); this._pushUndo();
    const P = em.geometry.attributes.position.array, n = P.length / 3; let x0 = 1e9, x1 = -1e9;
    for (let i = 0; i < n; i++) { const x = P[i * 3]; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const edge = (x1 - x0) * 0.18, cap = minThk ? 0.3 : 1.5; let cnt = 0;
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if (pres && (x < x0 + edge || x > x1 - edge)) continue;
      const [bj, d] = this._nearest(cloud, x, y, z); if (d >= limit) continue;
      const ux = x - cloud[bj], uy = y - cloud[bj + 1], uz = z - cloud[bj + 2], ul = Math.hypot(ux, uy, uz) || 1, k = Math.min(limit - d, cap) / ul;
      P[i * 3] += ux * k; P[i * 3 + 1] += uy * k; P[i * 3 + 2] += uz * k; cnt++;
    }
    this._refreshMesh(em); this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); return cnt;
  }
  _nbrCloud(mode, em) {
    this._clouds = this._clouds || {}; const key = 'n_' + mode; if (this._clouds[key]) return this._clouds[key];
    const p = this._prepPly; if (!p || !p.seg) return null;
    const f = this._focusNum, sg = p.seg, P = p.position, out = [], v = new THREE.Vector3(); if (!em.geometry.boundingBox) em.geometry.computeBoundingBox();
    const bb = em.geometry.boundingBox.clone().expandByScalar(5), step = mode === 'adjacent' ? 3 : 12; let c = 0;
    this.rig.updateWorldMatrix(true, true); em.updateWorldMatrix(true, false);
    for (let i = 0; i < sg.length; i++) {
      const s = sg[i]; if (mode === 'gingiva' ? s !== 0 : (s === 0 || (s !== f - 1 && s !== f + 1))) continue;
      if (++c % step) continue; v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); this.rig.localToWorld(v); em.worldToLocal(v); if (!bb.containsPoint(v)) continue; out.push(v.x, v.y, v.z);
    }
    return (this._clouds[key] = new Float32Array(out));
  }
  cutTo(mode, limit, smooth) {
    const em = this.restoration; if (!em) return -1;
    const cloud = mode === 'opposing' ? this._cloud('opposing', em) : this._nbrCloud(mode, em);
    if (!cloud) return mode === 'opposing' ? -1 : -2; if (!cloud.length) return 0;
    const gap = mode === 'opposing' ? limit : mode === 'adjacent' ? Math.max(0, 0.1 + limit) : Math.max(0, 0.2 + limit * 0.2);
    this._orig(em); this._pushUndo();
    const g = em.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3, moved = new Uint8Array(n);
    if (!g.boundingBox) g.computeBoundingBox(); const c0 = g.boundingBox.getCenter(new THREE.Vector3()); let cnt = 0;
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if ((x - c0.x) * N[i * 3] + (y - c0.y) * N[i * 3 + 1] + (z - c0.z) * N[i * 3 + 2] < 0) continue;
      const [bj, d] = this._nearest(cloud, x, y, z); if (d >= gap) continue;
      const ux = x - cloud[bj], uy = y - cloud[bj + 1], uz = z - cloud[bj + 2], ul = Math.hypot(ux, uy, uz) || 1, k = Math.min(gap - d, 1.5) / ul;
      P[i * 3] += ux * k; P[i * 3 + 1] += uy * k; P[i * 3 + 2] += uz * k; moved[i] = 1; cnt++;
    }
    if (cnt && smooth > 0) { const adj = this._adjacency(em); for (let r = 0; r < Math.round(smooth); r++) { const S = P.slice(); for (let i = 0; i < n; i++) { if (!moved[i]) continue; const nb = adj[i]; if (!nb.length) continue; let sx = 0, sy = 0, sz = 0; for (let q = 0; q < nb.length; q++) { sx += S[nb[q] * 3]; sy += S[nb[q] * 3 + 1]; sz += S[nb[q] * 3 + 2]; } P[i * 3] += (sx / nb.length - S[i * 3]) * 0.5; P[i * 3 + 1] += (sy / nb.length - S[i * 3 + 1]) * 0.5; P[i * 3 + 2] += (sz / nb.length - S[i * 3 + 2]) * 0.5; } } }
    this._refreshMesh(em); this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); return cnt;
  }
  mirrorCad(mode) {
    const em = this.restoration, R0 = this._preopRef, pp = this._prepPly; if (!em || !R0 || !pp) return -1;
    let mx0 = 1e9, mx1 = -1e9; for (let i = 0; i < pp.position.length; i += 3) { const x = pp.position[i]; if (x < mx0) mx0 = x; if (x > mx1) mx1 = x; }
    const xm = (mx0 + mx1) / 2, src = [], b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
    for (let i = 0; i < R0.length / 3; i += 3) { const x = 2 * xm - R0[i * 3], y = R0[i * 3 + 1], z = R0[i * 3 + 2]; src.push(x, y, z); b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z); }
    this._orig(em); this._pushUndo();
    const g = em.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3; if (!g.boundingBox) g.computeBoundingBox(); g.computeBoundingBox();
    const cb = g.boundingBox, cc = cb.getCenter(new THREE.Vector3()), cs = cb.getSize(new THREE.Vector3());
    const sc = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2], ss = [b.x1 - b.x0 || 1, b.y1 - b.y0 || 1, b.z1 - b.z0 || 1], cloud = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      let x = src[i], y = src[i + 1], z = src[i + 2];
      if (mode === 'geometry') { x = 2 * xm - x; }
      else if (mode === 'shape') { x = cc.x + (x - sc[0]) * (cs.x / ss[0]); y = cc.y + (y - sc[1]) * (cs.y / ss[1]); z = cc.z + (z - sc[2]) * (cs.z / ss[2]); }
      else { const k = cs.y / ss[1]; x = cc.x + (x - sc[0]) * k; y = cc.y + (y - sc[1]) * k; z = cc.z + (z - sc[2]) * k; }
      cloud[i] = x; cloud[i + 1] = y; cloud[i + 2] = z;
    }
    const moved = new Uint8Array(n); let cnt = 0;
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if ((x - cc.x) * N[i * 3] + (y - cc.y) * N[i * 3 + 1] + (z - cc.z) * N[i * 3 + 2] < 0) continue;
      const [bj] = this._nearest(cloud, x, y, z); P[i * 3] = cloud[bj]; P[i * 3 + 1] = cloud[bj + 1]; P[i * 3 + 2] = cloud[bj + 2]; moved[i] = 1; cnt++;
    }
    const adj = this._adjacency(em); for (let r = 0; r < 4; r++) { const S = P.slice(); for (let i = 0; i < n; i++) { if (!moved[i]) continue; const nb = adj[i]; if (!nb.length) continue; let sx = 0, sy = 0, sz = 0; for (let q = 0; q < nb.length; q++) { sx += S[nb[q] * 3]; sy += S[nb[q] * 3 + 1]; sz += S[nb[q] * 3 + 2]; } P[i * 3] += (sx / nb.length - S[i * 3]) * 0.6; P[i * 3 + 1] += (sy / nb.length - S[i * 3 + 1]) * 0.6; P[i * 3 + 2] += (sz / nb.length - S[i * 3 + 2]) * 0.6; } }
    this._refreshMesh(em); this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); return cnt;
  }
  _prepGrid(em) {
    const pt = this.prepTooth.geometry.attributes.position.array, c = 0.8, map = new Map(), pts = [], v3 = new THREE.Vector3();
    this.rig.updateWorldMatrix(true, true); em.updateWorldMatrix(true, false);
    for (let i = 0; i < pt.length; i += 6) { v3.set(pt[i], pt[i + 1], pt[i + 2]); this.prepTooth.localToWorld(v3); em.worldToLocal(v3); pts.push(v3.x, v3.y, v3.z); const k = this._gridKey(Math.floor(v3.x / c), Math.floor(v3.y / c), Math.floor(v3.z / c)); let a = map.get(k); if (!a) { a = []; map.set(k, a); } a.push(pts.length - 3); }
    return { pts, map, c };
  }
  _gridKey(a, b, c) { return ((a + 512) * 1024 + (b + 512)) * 1024 + (c + 512); }
  _nearGrid(G, x, y, z) {
    const c = G.c, ix = Math.floor(x / c), iy = Math.floor(y / c), iz = Math.floor(z / c); let best = 1e18;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let d = -2; d <= 2; d++) { const l = G.map.get(this._gridKey(ix + a, iy + b, iz + d)); if (!l) continue; for (let q = 0; q < l.length; q++) { const j = l[q], dx = G.pts[j] - x, dy = G.pts[j + 1] - y, dz = G.pts[j + 2] - z, dd = dx * dx + dy * dy + dz * dz; if (dd < best) best = dd; } }
    return best > 1e17 ? 9 : Math.sqrt(best);
  }
  _thkField() {
    const em = this.restoration; if (!em || !this.prepTooth) return null;
    const G = this._prepGrid(em), g = em.geometry, P = g.attributes.position.array, n = P.length / 3, d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = this._nearGrid(G, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    this._thk = { d, v: (this._thkV = (this._thkV || 0) + 1) }; this._thkStale = false; return this._thk;
  }
  _thinIdx(spec) {
    const em = this.restoration, T = this._thk, g = em.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3; if (!T || T.d.length !== n) return [];
    g.computeBoundingBox(); const bb = g.boundingBox, c0 = bb.getCenter(new THREE.Vector3()), out = [], h = bb.max.y - bb.min.y; let sl = 0, nl = 0, sh = 0, nh = 0;
    for (let i = 0; i < n; i++) { const t = (P[i * 3 + 1] - bb.min.y) / h; if (t < 0.15) { sl += T.d[i]; nl++; } else if (t > 0.85) { sh += T.d[i]; nh++; } }
    const hiMargin = sh / (nh || 1) < sl / (nl || 1), yLo = hiMargin ? -1e9 : bb.min.y + 1.0, yHi = hiMargin ? bb.max.y - 1.0 : 1e9;
    for (let i = 0; i < n; i++) { if (T.d[i] >= spec || P[i * 3 + 1] < yLo || P[i * 3 + 1] > yHi) continue; if ((P[i * 3] - c0.x) * N[i * 3] + (P[i * 3 + 1] - c0.y) * N[i * 3 + 1] + (P[i * 3 + 2] - c0.z) * N[i * 3 + 2] < 0) continue; out.push(i); }
    return out;
  }
  _thkUpdate() {
    const em = this.restoration, tool = this.getAttribute('tool');
    if (!em || !this._ready || !this.prepTooth) return;
    const spec = +this.getAttribute('thkspec') || 0.6;
    if (!this._thk0 && !this._thkEdits) { const T0 = this._thkField(); if (T0) { this._thk0 = T0.d.slice(); this._thkStale = true; } }
    if (this._thkStale && (tool === 'minthk' || this._thkEdits || this.getAttribute('wantthk')) && !this._thkT) {
      this._thkT = setTimeout(() => { this._thkT = null; const T = this._thkField(); if (!T) return; const idx = this._thinIdx(spec); let mn = 9; this._thinN = idx.length; const t0 = this._thk0; let nNew = 0, n02 = 0; if (t0 && t0.length === T.d.length) { idx.forEach(i => { if (t0[i] >= spec) nNew++; }); this._thinIdx(0.2).forEach(i => { if (t0[i] >= 0.2) n02++; }); } idx.forEach(i => { if (T.d[i] < mn) mn = T.d[i]; }); this.dispatchEvent(new CustomEvent('thin-info', { bubbles: true, composed: true, detail: { n: idx.length, min: mn, nNew, n02 } })); this._dirty = true; }, 350);
    }
    const on = tool === 'minthk' && this._thk && !this._thkStale;
    if (!on) { if (this._thinPts) this._thinPts.visible = false; return; }
    if (this._thinPtsV !== this._thk.v + ':' + spec) {
      this._thinPtsV = this._thk.v + ':' + spec; const idx = this._thinIdx(spec), P = em.geometry.attributes.position.array, arr = new Float32Array(idx.length * 3); idx.forEach((i, k) => { arr[k * 3] = P[i * 3]; arr[k * 3 + 1] = P[i * 3 + 1]; arr[k * 3 + 2] = P[i * 3 + 2]; });
      if (!this._thinPts) { this._thinPts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffb020, size: 3.4, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.95 })); this._thinPts.renderOrder = 4; em.add(this._thinPts); }
      this._thinPts.geometry.dispose(); this._thinPts.geometry = new THREE.BufferGeometry(); this._thinPts.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    }
    this._thinPts.visible = true;
  }
  _applyThickHeat() {
    const em = this.restoration; if (!em || !this.prepTooth) return; const g = em.geometry; let col = g.attributes.color;
    if (!col) { col = new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3); g.setAttribute('color', col); }
    if (!this._col0) this._col0 = col.array.slice();
    if (!em.material.vertexColors) { em.material.vertexColors = true; em.material.needsUpdate = true; }
    if (!this._thk || this._thkStale) { if (!this._thk) this._thkField(); else if (!this._thkT) { /* repaint after recompute */ } }
    const T = this._thk; if (!T || this._thkPaint === T.v) { this._heatOn = true; return; }
    this._thkPaint = T.v; this._heatOn = true;
    const P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3, c = col.array, spec = +this.getAttribute('thkspec') || 0.6; g.computeBoundingBox(); const c0 = g.boundingBox.getCenter(new THREE.Vector3());
    for (let i = 0; i < n; i++) {
      const o = this._col0, gray = (o[i * 3] + o[i * 3 + 1] + o[i * 3 + 2]) / 3 * 0.75 + 0.1, d = T.d[i];
      if ((P[i * 3] - c0.x) * N[i * 3] + (P[i * 3 + 1] - c0.y) * N[i * 3 + 1] + (P[i * 3 + 2] - c0.z) * N[i * 3 + 2] < 0) { c[i * 3] = gray; c[i * 3 + 1] = gray; c[i * 3 + 2] = gray; continue; }
      const k = d < spec ? [0.9, 0.2, 0.16] : d < spec * 1.6 ? [0.98, 0.84, 0.25] : [0.42, 0.84, 0.56]; c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2];
    }
    col.needsUpdate = true; this._dirty = true;
  }
  minThkApply(spec, width, strength) {
    const em = this.restoration; if (!em || !this.prepTooth) return -1;
    const T = (this._thk && !this._thkStale) ? this._thk : this._thkField(); const thin = this._thinIdx(spec); if (!thin.length) return 0;
    this._orig(em); this._pushUndo();
    const g = em.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3, adj = this._adjacency(em), isThin = new Uint8Array(n), seen = new Uint8Array(n), moved = new Uint8Array(n);
    thin.forEach(i => { isThin[i] = 1; });
    for (const s0 of thin) {
      if (seen[s0]) continue; const q = [s0], list = []; seen[s0] = 1; let dx = 0, dy = 0, dz = 0;
      while (q.length) { const i = q.pop(); list.push(i); dx += N[i * 3]; dy += N[i * 3 + 1]; dz += N[i * 3 + 2]; for (const j of adj[i]) if (isThin[j] && !seen[j]) { seen[j] = 1; q.push(j); } }
      const l = Math.hypot(dx, dy, dz) || 1, shared = l / list.length > 0.5; dx /= l; dy /= l; dz /= l;
      for (const i of list) { const need = spec + 0.02 - T.d[i]; if (need > 0) { const ux = shared ? dx : N[i * 3], uy = shared ? dy : N[i * 3 + 1], uz = shared ? dz : N[i * 3 + 2]; P[i * 3] += ux * need; P[i * 3 + 1] += uy * need; P[i * 3 + 2] += uz * need; moved[i] = 1; } }
    }
    for (let pass = 0; pass < 8; pass++) {
      const T2 = this._thkField(), rest = this._thinIdx(spec); if (!rest.length) break;
      for (const i of rest) { const need = (spec + 0.02 - T2.d[i]) * 0.9; if (need > 0) { P[i * 3] += N[i * 3] * need; P[i * 3 + 1] += N[i * 3 + 1] * need; P[i * 3 + 2] += N[i * 3 + 2] * need; moved[i] = 1; } }
    }
    let ring = []; for (let i = 0; i < n; i++) if (moved[i]) ring.push(i);
    const inR = moved.slice(); let front = ring.slice(); const all = ring.slice();
    for (let r = 0; r < Math.round(width); r++) { const nx = []; for (const i of front) for (const j of adj[i]) if (!inR[j]) { inR[j] = 1; nx.push(j); all.push(j); } front = nx; }
    for (let p = 0; p < Math.round(strength); p++) { const S = P.slice(); for (const i of all) { const nb = adj[i]; if (!nb.length) continue; let sx = 0, sy = 0, sz = 0; for (const j of nb) { sx += S[j * 3]; sy += S[j * 3 + 1]; sz += S[j * 3 + 2]; } const ax = sx / nb.length - S[i * 3], ay = sy / nb.length - S[i * 3 + 1], az = sz / nb.length - S[i * 3 + 2], al = ax * N[i * 3] + ay * N[i * 3 + 1] + az * N[i * 3 + 2]; if (al > 0) { P[i * 3] += N[i * 3] * al * 0.5; P[i * 3 + 1] += N[i * 3 + 1] * al * 0.5; P[i * 3 + 2] += N[i * 3 + 2] * al * 0.5; } } }
    this._refreshMesh(em); this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); return thin.length;
  }
  flipCut() { if (this._cut) { this._cut.flip *= -1; this._dirty = true; } }
  resetCut() { this._cut = null; this._dirty = true; }
  applyCut() {
    const em = this.restoration, C = this._cut; if (!em || !C) return 0;
    this._orig(em); this._pushUndo();
    const P = em.geometry.attributes.position.array, n = C.n.clone().multiplyScalar(C.flip), pl = C.a.clone().addScaledVector(n, C.depth);
    let cnt = 0;
    for (let i = 0; i < P.length; i += 3) { const d = (P[i] - pl.x) * n.x + (P[i + 1] - pl.y) * n.y + (P[i + 2] - pl.z) * n.z; if (d > 0) { P[i] -= n.x * d; P[i + 1] -= n.y * d; P[i + 2] -= n.z * d; cnt++; } }
    this._refreshMesh(em); this._metrics(); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); return cnt;
  }
  _cutClip(on, keep, ghost) {
    const em = this.restoration; if (!em) return;
    if (on) {
      this.renderer.localClippingEnabled = true;
      if (this._cutSide === undefined) this._cutSide = em.material.side;
      if (!em.material.clippingPlanes) { em.material.side = THREE.DoubleSide; em.material.needsUpdate = true; }
      em.material.clippingPlanes = [keep];
      if (!this._cutGhost) { this._cutGhost = new THREE.Mesh(em.geometry, new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [ghost] })); this._cutGhost.renderOrder = 3; em.add(this._cutGhost); }
      this._cutGhost.material.clippingPlanes = [ghost]; this._cutGhost.visible = true;
    } else if (em.material.clippingPlanes) {
      em.material.clippingPlanes = null; if (this._cutSide !== undefined) em.material.side = this._cutSide; em.material.needsUpdate = true; if (this._cutGhost) this._cutGhost.visible = false; this._dirty = true;
    }
  }
  _cutBuild() {
    const L = this._cutLayer = document.createElement('div'); L.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden';
    const svg = this._cutSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
    svg.innerHTML = '<polygon fill="rgba(255,176,32,.13)"/><line class="o" stroke="rgba(0,30,20,.5)" stroke-width="4.5" stroke-linecap="round"/><line class="l" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'; L.appendChild(svg);
    const glass = 'background:rgba(0,30,20,.58);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1.5px solid rgba(255,255,255,.95);box-shadow:0 1px 6px rgba(0,0,0,.4);';
    const mk = (id, size, inner, cursor) => { const el = document.createElement('div'); el.style.cssText = 'position:absolute;width:' + (size + 16) + 'px;height:' + (size + 16) + 'px;margin:-' + (size + 16) / 2 + 'px 0 0 -' + (size + 16) / 2 + 'px;pointer-events:auto;cursor:' + cursor + ';touch-action:none;display:grid;place-items:center'; const i = document.createElement('div'); i.style.cssText = 'box-sizing:border-box;width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:grid;place-items:center;transition:transform .12s,background .12s;' + glass; i.innerHTML = inner; el.appendChild(i); el.addEventListener('pointerenter', () => { i.style.transform = 'scale(1.18)'; i.style.background = 'rgba(21,137,21,.88)'; }); el.addEventListener('pointerleave', () => { if (this._cutD) return; i.style.transform = ''; i.style.background = 'rgba(0,30,20,.58)'; }); el.addEventListener('pointerdown', e => this._cutDown(e, id, el)); el.addEventListener('pointermove', e => this._cutMove(e)); el.addEventListener('pointerup', e => this._cutUp(e)); el.addEventListener('pointercancel', e => this._cutUp(e)); L.appendChild(el); return el; };
    const ic = (p, s) => '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
    this._cutH = { A: mk('A', 18, '<span style="width:6px;height:6px;border-radius:50%;background:#fff;display:block"></span>', 'grab'), B: mk('B', 18, '<span style="width:6px;height:6px;border-radius:50%;background:#fff;display:block"></span>', 'grab'), M: mk('M', 30, ic('<path d="M12 4v16M4 12h16M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5"/>', 17), 'move') };
    const fl = this._cutFlip = document.createElement('button'); fl.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:6px;height:28px;padding:0 11px 0 9px;border-radius:999px;border:1.5px solid rgba(255,255,255,.95);background:rgba(0,30,20,.72);backdrop-filter:blur(6px);color:#fff;font:600 11.5px/1 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35)';
    fl.innerHTML = ic('<path d="M7 4v13M3.5 13.5L7 17l3.5-3.5M17 20V7M13.5 10.5L17 7l3.5 3.5"/>', 13) + '<span>Removes this side</span>'; fl.addEventListener('pointerdown', e => e.stopPropagation()); fl.addEventListener('click', () => this.flipCut()); L.appendChild(fl);
    this.appendChild(L);
  }
  _cutScr(e) {
    const r = this.canvas.getBoundingClientRect(), nd = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(nd, this.camera);
    const em = this.restoration, C = this._cut, mid = em.localToWorld(C.a.clone().add(C.b).multiplyScalar(0.5)), pl = new THREE.Plane().setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()), mid), hit = new THREE.Vector3();
    return rc.ray.intersectPlane(pl, hit) ? em.worldToLocal(hit) : null;
  }
  _cutDown(e, id, el) { e.stopPropagation(); e.preventDefault(); el.setPointerCapture(e.pointerId); this._cutD = { id, last: this._cutScr(e) }; }
  _cutMove(e) {
    const d = this._cutD; if (!d) return; e.stopPropagation(); const p = this._cutScr(e); if (!p || !d.last) return; const C = this._cut;
    if (d.id === 'M') { const dl = p.clone().sub(d.last); C.a.add(dl); C.b.add(dl); } else C[d.id === 'A' ? 'a' : 'b'].copy(p);
    d.last = p; this._cutNormal(); this._dirty = true;
  }
  _cutUp(e) { this._cutD = null; this._dirty = true; }
  _cutUpdate() {
    const on = this.getAttribute('tool') === 'cutpln' && this.restoration && this._ready;
    if (!on) { if (this._cutLayer) this._cutLayer.style.display = 'none'; this._cutClip(false); return; }
    if (!this._cut) this._cutInit();
    if (!this._cutLayer) this._cutBuild();
    const C = this._cut, em = this.restoration; C.depth = +this.getAttribute('cutdepth') || 0; this._cutLayer.style.display = ''; em.updateWorldMatrix(true, false);
    const n = C.n.clone().multiplyScalar(C.flip), pL = C.a.clone().addScaledVector(n, C.depth), nW = n.clone().transformDirection(em.matrixWorld), pW = pL.clone().applyMatrix4(em.matrixWorld);
    this._cutClip(true, new THREE.Plane().setFromNormalAndCoplanarPoint(nW.clone().negate(), pW), new THREE.Plane().setFromNormalAndCoplanarPoint(nW, pW));
    const W = this.clientWidth, H = this.clientHeight, proj = (p) => { const q = em.localToWorld(p.clone()).project(this.camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
    const sa = proj(C.a.clone().addScaledVector(n, C.depth)), sb = proj(C.b.clone().addScaledVector(n, C.depth)), sn0 = proj(C.a.clone().addScaledVector(n, C.depth + 1));
    let ux = sb[0] - sa[0], uy = sb[1] - sa[1]; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    let nx = sn0[0] - sa[0], ny = sn0[1] - sa[1]; const nl = Math.hypot(nx, ny);
    if (nl < 1) { nx = uy; ny = -ux; } else { nx /= nl; ny /= nl; }
    const F = 4000, p1 = [sa[0] - ux * F, sa[1] - uy * F], p2 = [sb[0] + ux * F, sb[1] + uy * F], S = this._cutSvg;
    S.querySelector('polygon').setAttribute('points', [p1, p2, [p2[0] + nx * F, p2[1] + ny * F], [p1[0] + nx * F, p1[1] + ny * F]].map(q => q.join(',')).join(' '));
    ['o', 'l'].forEach(c => { const l = S.querySelector('.' + c); l.setAttribute('x1', p1[0]); l.setAttribute('y1', p1[1]); l.setAttribute('x2', p2[0]); l.setAttribute('y2', p2[1]); });
    const P = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; }, mx = (sa[0] + sb[0]) / 2, my = (sa[1] + sb[1]) / 2;
    P(this._cutH.A, sa[0], sa[1]); P(this._cutH.B, sb[0], sb[1]); P(this._cutH.M, mx, my); P(this._cutFlip, mx + nx * 46, my + ny * 46);
  }
  _cejUpdate() {
    const on = this.getAttribute('tool') === 'cej' && this._cej && this._cej.length && this.restoration && this._ready;
    if (!on) { if (this._cejSvg) this._cejSvg.style.display = 'none'; return; }
    if (!this._cejSvg) { const s = this._cejSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:visible'; s.innerHTML = '<polyline fill="none" stroke="#1F4BFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><g id="d"></g>'; this.appendChild(s); }
    const S = this._cejSvg; S.style.display = '';
    const em = this.restoration, W = this.clientWidth, H = this.clientHeight, pts = this._cej.map(p => { const q = em.localToWorld(p.clone()).project(this.camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; });
    S.querySelector('polyline').setAttribute('points', pts.map(p => p.join(',')).join(' '));
    const step = Math.max(1, Math.ceil(pts.length / 7)), keep = pts.filter((p, i) => i % step === 0 || i === pts.length - 1);
    S.querySelector('#d').innerHTML = keep.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#1F6BFF" stroke="#fff" stroke-width="2"/>').join('');
  }
  resetAngles() { this._las = []; this._laNext = 0; this.dispatchEvent(new CustomEvent('la-line', { bubbles: true, composed: true, detail: false })); this.resetCrown(); }
  _laUpdate() {
    const on = this.getAttribute('tool') === 'angles' && this._las && this._las.length && this.restoration && this._ready;
    if (!on) { if (this._laSvg) this._laSvg.style.display = 'none'; return; }
    if (!this._laSvg) {
      const s = this._laSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:visible';
      s.innerHTML = [0, 1].map(i => '<g id="g' + i + '"><line stroke-width="3.5" stroke-linecap="round"/><circle r="7" stroke="#fff" stroke-width="2"/><circle r="7" stroke="#fff" stroke-width="2"/></g>').join(''); this.appendChild(s);
    }
    const S = this._laSvg; S.style.display = '';
    const em = this.restoration, W = this.clientWidth, H = this.clientHeight, proj = (p) => { const q = em.localToWorld(p.clone()).project(this.camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
    const deform = (this.getAttribute('anglemode') || 'mark') === 'deform', col = deform ? '#6BCB3A' : '#1F6BFF', ln = deform ? '#2E7D1E' : '#1F4BFF';
    [0, 1].forEach(i => {
      const g = S.querySelector('#g' + i), L = this._las[i]; g.style.display = L ? '' : 'none'; if (!L) return;
      const a = proj(L.a), b = proj(L.b), l = g.querySelector('line'), cs = g.querySelectorAll('circle');
      l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]); l.setAttribute('stroke', ln); l.setAttribute('stroke-dasharray', L.preview ? '0.1 8' : ''); l.setAttribute('stroke-width', L.preview ? 3 : 3.5);
      cs[0].setAttribute('cx', a[0]); cs[0].setAttribute('cy', a[1]); cs[0].setAttribute('fill', col); cs[1].setAttribute('cx', b[0]); cs[1].setAttribute('cy', b[1]); cs[1].setAttribute('fill', L.preview ? 'rgba(255,255,255,.35)' : col); cs[1].setAttribute('stroke', L.preview ? col : '#fff');
    });
  }
  _xfBuild() {
    const L = this._xfLayer = document.createElement('div'); L.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden';
    const box = this._xfBox = document.createElement('div'); box.style.cssText = 'position:absolute;box-sizing:border-box;border:1.5px solid rgba(255,255,255,.9);border-radius:8px;background:rgba(26,192,101,.07);box-shadow:0 0 0 1px rgba(0,30,20,.35),inset 0 0 0 1px rgba(0,30,20,.18)'; L.appendChild(box);
    const line = this._xfLine = document.createElement('div'); line.style.cssText = 'position:absolute;width:1.5px;background:rgba(255,255,255,.85);box-shadow:0 0 0 .5px rgba(0,30,20,.3)'; L.appendChild(line);
    const out = this._xfOut = document.createElement('div'); out.style.cssText = 'position:absolute;display:none;transform:translateX(-50%);padding:4px 9px;border-radius:999px;background:rgba(0,30,20,.82);color:#fff;font:600 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35)'; L.appendChild(out);
    const ICON = { move: '<path d="M12 4v16M4 12h16M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5"/>', rot: '<path d="M19 12a7 7 0 1 1-2.2-5.100M19 4v4h-4"/>' };
    const mk = (id, kind) => {
      const el = document.createElement('div'); const cur = kind === 'h' ? 'ew-resize' : kind === 'v' ? 'ns-resize' : kind === 'move' ? 'move' : 'grab';
      el.style.cssText = 'position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:auto;cursor:' + cur + ';touch-action:none;display:grid;place-items:center';
      const i = document.createElement('div'); const base = 'box-sizing:border-box;background:#fff;border:2px solid #1AC065;box-shadow:0 1px 5px rgba(0,30,20,.45);transition:transform .12s,background .12s;display:grid;place-items:center;';
      if (kind === 'h') i.style.cssText = base + 'width:9px;height:28px;border-radius:5px';
      else if (kind === 'v') i.style.cssText = base + 'width:28px;height:9px;border-radius:5px';
      else { i.style.cssText = 'box-sizing:border-box;width:' + (kind === 'move' ? 32 : 26) + 'px;height:' + (kind === 'move' ? 32 : 26) + 'px;border-radius:50%;background:rgba(0,30,20,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1.5px solid rgba(255,255,255,.95);box-shadow:0 1px 6px rgba(0,0,0,.4);transition:transform .12s,background .12s;display:grid;place-items:center'; i.innerHTML = '<svg width="' + (kind === 'move' ? 18 : 15) + '" height="' + (kind === 'move' ? 18 : 15) + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[kind] + '</svg>'; }
      el.appendChild(i);
      el.addEventListener('pointerenter', () => { i.style.transform = 'scale(1.18)'; if (kind === 'h' || kind === 'v') i.style.background = '#BFF3D6'; else i.style.background = 'rgba(21,137,21,.85)'; });
      el.addEventListener('pointerleave', () => { if (this._xfD) return; i.style.transform = ''; i.style.background = (kind === 'h' || kind === 'v') ? '#fff' : 'rgba(0,30,20,.55)'; });
      L.appendChild(el); el.addEventListener('pointerdown', e => this._xfDown(e, id, el)); el.addEventListener('pointermove', e => this._xfMove(e)); el.addEventListener('pointerup', e => this._xfUp(e)); el.addEventListener('pointercancel', e => this._xfUp(e));
      return el;
    };
    this._xfH = { L: mk('L', 'h'), R: mk('R', 'h'), T: mk('T', 'v'), B: mk('B', 'v'), C: mk('C', 'move'), O: mk('O', 'rot') };
    this.appendChild(L);
  }
  _xfUpdate() {
    const on = this.getAttribute('tool') === 'xform' && this.restoration && this._ready;
    if (!on) { if (this._xfLayer) this._xfLayer.style.display = 'none'; return; }
    if (!this._xfLayer) this._xfBuild();
    const R0 = this.restoration; this._xfLayer.style.display = '';
    if (!R0.geometry.boundingBox) R0.geometry.computeBoundingBox();
    R0.updateWorldMatrix(true, false);
    const bb = R0.geometry.boundingBox, W = this.clientWidth, H = this.clientHeight, v = new THREE.Vector3();
    let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(R0.matrixWorld).project(this.camera); const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py); }
    const cx = (l + r) / 2, cy = (t + b) / 2, S = this._xfBox.style, P = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
    S.left = l + 'px'; S.top = t + 'px'; S.width = (r - l) + 'px'; S.height = (b - t) + 'px';
    const h = this._xfH; P(h.L, l, cy); P(h.R, r, cy); P(h.T, cx, t); P(h.B, cx, b); P(h.C, cx, cy); P(h.O, cx, t - 34); const ln = this._xfLine.style; ln.left = (cx - 0.75) + 'px'; ln.top = (t - 34 + 13) + 'px'; ln.height = '21px'; if (this._xfD) { const o = this._xfOut; o.style.left = cx + 'px'; o.style.top = (b + 18) + 'px'; }
  }
  _xfDown(e, id, el) { e.stopPropagation(); e.preventDefault(); el.setPointerCapture(e.pointerId); this._xfD = { id, lx: e.clientX, ly: e.clientY }; this._xfOut.style.display = 'block'; this._xf = this._xf || { sx: 1, sy: 1, ox: 0, oy: 0, rot: 0 }; this._pushUndo('xf'); }
  _xfMove(e) {
    const d = this._xfD; if (!d) return; e.stopPropagation();
    const dx = e.clientX - d.lx, dy = e.clientY - d.ly; d.lx = e.clientX; d.ly = e.clientY;
    const X = this._xf, R0 = this.restoration, k = this._perPixel(), box = () => new THREE.Box3().setFromObject(R0, true);
    const LIM = { sx: [0.88, 1.12, 'width'], sy: [0.9, 1.1, 'height'] }; let hit = null;
    const apply = (key, rate) => { const raw = X[key] * rate, [lo, hi, nm] = LIM[key]; if (raw > hi) hit = nm + '-max'; else if (raw < lo) hit = nm + '-min'; X[key] = Math.max(lo, Math.min(hi, raw)); };
    if (d.id === 'C') { X.ox += dx * k; X.oy -= dy * k; X.ox = Math.max(-3, Math.min(3, X.ox)); X.oy = Math.max(-3, Math.min(3, X.oy)); this._applyTemplate(); }
    else if (d.id === 'O') { X.rot = Math.max(-0.6, Math.min(0.6, X.rot - dx * 0.006)); this._applyTemplate(); }
    else {
      const b0 = box(), sz0 = b0.getSize(new THREE.Vector3());
      if (d.id === 'L' || d.id === 'R') { const nw = Math.max(1, sz0.x + (d.id === 'R' ? dx : -dx) * k); apply('sx', nw / sz0.x); this._applyTemplate(); const b1 = box(); X.ox += d.id === 'L' ? b0.max.x - b1.max.x : b0.min.x - b1.min.x; }
      else { const nh = Math.max(1, sz0.y + (d.id === 'B' ? dy : -dy) * k); apply('sy', nh / sz0.y); this._applyTemplate(); const b1 = box(); X.oy += d.id === 'T' ? b0.min.y - b1.min.y : b0.max.y - b1.max.y; }
      this._applyTemplate();
    }
    this._xfLimit(hit);
    { const sz = new THREE.Box3().setFromObject(R0, true).getSize(new THREE.Vector3()); this._xfOut.textContent = d.id === 'O' ? 'Rotate ' + Math.round(-X.rot * 57.3) + '\u00B0' : d.id === 'C' ? 'Move' : 'W ' + sz.x.toFixed(1) + ' \u00B7 H ' + sz.y.toFixed(1) + ' mm'; }
    this._dirty = true;
  }
  _xfLimit(kind) {
    if (kind === (this._xfLim || null)) return; this._xfLim = kind || null;
    if (this._xfBox) { this._xfBox.style.borderColor = kind ? '#FFB020' : 'rgba(255,255,255,.9)'; this._xfBox.style.background = kind ? 'rgba(255,176,32,.10)' : 'rgba(26,192,101,.07)'; }
    this.dispatchEvent(new CustomEvent('xform-limit', { bubbles: true, composed: true, detail: kind || null }));
  }
  _xfUp(e) { if (!this._xfD) return; this._xfD = null; this._xfOut.style.display = 'none'; this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); }
  _genMakeCloud() {
    const R0 = this.restoration; if (!R0) return;
    if (!this._genPts) {
      const N = 1400, geo = new THREE.BufferGeometry(), arr = new Float32Array(N * 3), src = R0.geometry.attributes.position.array, nV = src.length / 3;
      this._genBasePts = new Float32Array(N * 3); this._genOff = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const v = (Math.random() * nV) | 0; this._genBasePts.set([src[v * 3], src[v * 3 + 1], src[v * 3 + 2]], i * 3); const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), r = 2 + Math.random() * 6; this._genOff.set([r * Math.sin(b) * Math.cos(a), r * Math.sin(b) * Math.sin(a), r * Math.cos(b)], i * 3); }
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this._genPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9dffb0, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.95, depthTest: false }));
      this._genPts.renderOrder = 30; this._genPts.frustumCulled = false; R0.add(this._genPts);
    }
    this._genPts.visible = true;
  }
  _frontTheta() {
    if (this._ftCache !== undefined) return this._ftCache;
    const pl = this._prepPly; this._ftCache = null;
    if (!pl || !pl.seg) return null;
    const sx = new Float64Array(33), sz = new Float64Array(33), n = new Int32Array(33);
    for (let i = 0; i < pl.seg.length; i += 2) { const g = pl.seg[i]; if (g < 1 || g > 32) continue; sx[g] += pl.position[i * 3]; sz[g] += pl.position[i * 3 + 2]; n[g]++; }
    const have = []; for (let g = 1; g <= 16; g++) if (n[g] > 40) have.push(g);
    if (have.length < 4 || n[8] < 40 || n[9] < 40) return null;
    const c = g => [sx[g] / n[g], sz[g] / n[g]], a = c(have[0]), b = c(have[have.length - 1]), c8 = c(8), c9 = c(9);
    const px = (a[0] + b[0]) / 2, pz = (a[1] + b[1]) / 2, ax = (c8[0] + c9[0]) / 2, az = (c8[1] + c9[1]) / 2;
    if (Math.hypot(ax - px, az - pz) < 1) return null;
    return (this._ftCache = Math.atan2(ax - px, az - pz));
  }
  snap() { this.renderer.render(this.scene, this.camera); return this.canvas.toDataURL('image/jpeg', 0.9); }
  getCamera() { return { theta: this._sph.theta, phi: this._sph.phi, radius: this._sph.radius, target: this._target.toArray() }; }
  setCamera(c) { if (!c) return; this._sph.theta = c.theta; this._sph.phi = c.phi; this._sph.radius = c.radius; this._target.fromArray(c.target); this._dirty = true; }
  resetView(view) { this._lastView = view; this._goView(view); }

  _applyTemplate() {
    if (!this.restoration || !this.center) return;
    const TPL = {
      'central-a': [1.00, 1.00, 1.00],
      'central-b': [1.11, 0.96, 1.02],
      'central-c': [0.89, 1.04, 0.99],
      'central-d': [1.02, 0.86, 0.98],
      'central-e': [0.98, 1.09, 1.03],
      'central-f': [1.05, 0.99, 0.90],
      'mimic-preop': [1.03, 0.97, 1.05],
      'mimic-mirror': [0.95, 1.03, 0.97],
      'mimic-adjacent': [1.08, 1.01, 0.94],
    };
    const s0 = TPL[this.getAttribute('crowntpl')] || TPL['central-a'], X = this._xf || { sx: 1, sy: 1, ox: 0, oy: 0, rot: 0 }, s = [s0[0] * X.sx, s0[1] * X.sy, s0[2]];
    const c = this.center, R0 = this.restoration;
    R0.scale.set(s[0] * 1.004, s[1] * 1.004, s[2] * 1.004);
    R0.position.set(c.x - c.x * s[0], c.y - c.y * s[1], c.z - c.z * s[2]);
    if (this._userOffset) R0.position.add(this._userOffset);
    R0.position.x += X.ox; R0.position.y += X.oy;
    if (X.rot) {
      if (!R0.geometry.boundingBox) R0.geometry.computeBoundingBox();
      const Cs = R0.geometry.boundingBox.getCenter(new THREE.Vector3()).multiply(R0.scale), Z = new THREE.Vector3(0, 0, 1);
      R0.position.add(Cs).sub(Cs.clone().applyAxisAngle(Z, X.rot)); R0.quaternion.setFromAxisAngle(Z, X.rot);
    } else R0.quaternion.set(0, 0, 0, 1);
    R0.updateMatrixWorld(true);
  }

  _radius() { return +this.getAttribute('brushr') || 2.2; }
  _strength() { return +this.getAttribute('brushs') || 0.5; }
  _em() { return this.getAttribute('etarget') === 'stump' && this.prepTooth ? this.prepTooth : this.restoration; }
  _orig(mesh) { const u = mesh.userData; if (!u.orig) u.orig = mesh.geometry.attributes.position.array.slice(); return u.orig; }
  _perPixel() {
    const h = this.clientHeight || 600;
    return 2 * this.camera.position.distanceTo(this._target) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / h;
  }
  _adjacency(mesh) {
    if (mesh.userData.adj) return mesh.userData.adj;
    const geo = mesh.geometry, n = geo.attributes.position.count, ix = geo.index.array;
    const sets = Array.from({ length: n }, () => new Set());
    for (let i = 0; i < ix.length; i += 3) { const a = ix[i], b = ix[i + 1], c = ix[i + 2]; sets[a].add(b).add(c); sets[b].add(a).add(c); sets[c].add(a).add(b); }
    mesh.userData.adj = sets.map(s => Int32Array.from(s));
    return mesh.userData.adj;
  }
  _refreshMesh(mesh) {
    const g = mesh.geometry;
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    if (mesh === this.restoration) { this._thkStale = true; this._thkEdits = true; }
    if (mesh === this.restoration && this._heatOn) this._applyHeat();
    if (mesh === this.restoration && this._vz && this._vz.has('collisions')) this._applyViz();
  }
  _refreshCrown() { this._refreshMesh(this._em()); }
  _snap(kind) {
    if (kind === 'trim') return { type: 'trim', removed: this._removed ? this._removed.slice() : null };
    if (kind === 'xf') return { type: 'xf', xf: this._xf ? Object.assign({}, this._xf) : null };
    const m = this._em(); return { type: 'mesh', mesh: m, a: m.geometry.attributes.position.array.slice(), off: this._userOffset.clone(), xf: this._xf ? Object.assign({}, this._xf) : null };
  }
  _restore(s) {
    if (s.type === 'trim') { this._removed = s.removed; this._rebuildArch(); return; }
    if (s.type === 'xf') { this._xf = s.xf ? Object.assign({}, s.xf) : null; this._applyTemplate(); this._dirty = true; return; }
    s.mesh.geometry.attributes.position.array.set(s.a); this._userOffset.copy(s.off); this._xf = s.xf ? Object.assign({}, s.xf) : null;
    this._refreshMesh(s.mesh); this._applyTemplate();
  }
  _hist() { this._metrics(); this.dispatchEvent(new CustomEvent('crown-hist', { bubbles: true, composed: true, detail: { u: this._undo.length, r: (this._redo || []).length } })); }
  _pushUndo(kind) {
    this._undo.push(this._snap(kind)); this._redo = [];
    if (this._undo.length > 25) this._undo.shift();
    this._hist();
  }
  undoCrown() {
    const s = this._undo && this._undo.pop();
    if (!s) return false;
    (this._redo = this._redo || []).push(this._snap(s.type === 'mesh' ? undefined : s.type)); this._restore(s); this._xfLimit && this._xfLimit(null); this._hist();
    return true;
  }
  redoCrown() {
    const s = this._redo && this._redo.pop();
    if (!s) return false;
    this._undo.push(this._snap(s.type === 'mesh' ? undefined : s.type)); this._restore(s); this._hist();
    return true;
  }
  resetCrown() {
    if (this.getAttribute('tool') === 'trim') { this._pushUndo('trim'); this._removed = null; this._rebuildArch(); return; }
    const m = this._em(); this._pushUndo();
    this._xf = null; this._xfLimit && this._xfLimit(null);
    m.geometry.attributes.position.array.set(this._orig(m));
    this._userOffset.set(0, 0, 0);
    this._refreshMesh(m); this._applyTemplate();
  }
  /* ---- trim: remove faces of the scan ---- */
  _faceData() {
    if (this._fc) return;
    const g = this.arch.geometry, ix = g.index.array, p = g.attributes.position.array, F = ix.length / 3;
    this._idx0 = ix.slice(); this._fc = new Float32Array(F * 3);
    for (let f = 0; f < F; f++) for (let k = 0; k < 3; k++) this._fc[f * 3 + k] = (p[ix[f * 3] * 3 + k] + p[ix[f * 3 + 1] * 3 + k] + p[ix[f * 3 + 2] * 3 + k]) / 3;
  }
  _syncAutoHide() {
    if (!this.arch) return;
    const hide = !!this.getAttribute('trimhide') && !!this._trimF;
    if (hide === !!this._autoHidden) return;
    this._autoHidden = hide;
    if (hide && !this._autoRm) {
      this._faceData();
      const F = this._idx0.length / 3, T = this._trimF, C = 0.4, grid = new Map(), k = (x, y, z) => x + ',' + y + ',' + z;
      for (let i = 0; i < T.length; i += 3) { const key = k(Math.floor(T[i] / C), Math.floor(T[i + 1] / C), Math.floor(T[i + 2] / C)); (grid.get(key) || grid.set(key, []).get(key)).push(i); }
      const rm = this._autoRm = new Uint8Array(F), tol2 = 0.12 * 0.12, fc = this._fc;
      for (let f = 0; f < F; f++) {
        const x = fc[f * 3], y = fc[f * 3 + 1], z = fc[f * 3 + 2], cx = Math.floor(x / C), cy = Math.floor(y / C), cz = Math.floor(z / C);
        loop: for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          const l = grid.get(k(cx + dx, cy + dy, cz + dz)); if (!l) continue;
          for (const i of l) { const a = T[i] - x, b = T[i + 1] - y, d = T[i + 2] - z; if (a * a + b * b + d * d < tol2) { rm[f] = 1; break loop; } }
        }
      }
    }
    this._rebuildArch(); this._dirty = true;
  }
  _rebuildArch() {
    this._faceData();
    const F = this._idx0.length / 3, rm0 = this._removed, ah = this._autoHidden && this._autoRm, rm = { }; let keep = 0;
    const gone = f => (rm0 && rm0[f]) || (ah && ah[f]);
    for (let f = 0; f < F; f++) if (!gone(f)) keep++;
    const out = new Uint32Array(keep * 3); let o = 0;
    for (let f = 0; f < F; f++) if (!gone(f)) { out[o++] = this._idx0[f * 3]; out[o++] = this._idx0[f * 3 + 1]; out[o++] = this._idx0[f * 3 + 2]; }
    this.arch.geometry.setIndex(new THREE.BufferAttribute(out, 1));
    this.arch.geometry.computeBoundingSphere();
  }
  _trimAt(hit, rOverride) {
    this._faceData();
    const F = this._idx0.length / 3, R = rOverride || this._radius() * 1.5, r2 = R * R, c = this.arch.worldToLocal(hit.point.clone());
    if (!this._removed) this._removed = new Uint8Array(F);
    let changed = 0;
    for (let f = 0; f < F; f++) { if (this._removed[f]) continue; const a = this._fc[f * 3] - c.x, b = this._fc[f * 3 + 1] - c.y, d = this._fc[f * 3 + 2] - c.z; if (a * a + b * b + d * d < r2) { this._removed[f] = 1; changed++; } }
    if (changed) this._rebuildArch();
  }
  trimIslands() {
    this._faceData(); this._pushUndo('trim');
    const F = this._idx0.length / 3, nV = this.arch.geometry.attributes.position.count, rm = this._removed || (this._removed = new Uint8Array(F));
    const par = new Int32Array(nV); for (let i = 0; i < nV; i++) par[i] = i;
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let f = 0; f < F; f++) { if (rm[f]) continue; const a = find(this._idx0[f * 3]), b = find(this._idx0[f * 3 + 1]), c = find(this._idx0[f * 3 + 2]); par[b] = a; par[find(c)] = find(a); }
    const cnt = new Map(); for (let f = 0; f < F; f++) { if (rm[f]) continue; const r = find(this._idx0[f * 3]); cnt.set(r, (cnt.get(r) || 0) + 1); }
    let big = 0; cnt.forEach(n => { if (n > big) big = n; });
    let islands = 0; cnt.forEach(n => { if (n < big * 0.03) islands++; });
    for (let f = 0; f < F; f++) { if (rm[f]) continue; if (cnt.get(find(this._idx0[f * 3])) < big * 0.03) rm[f] = 1; }
    this._rebuildArch(); return islands;
  }
  /* ---- bite: push the antagonist out of the upper arch ---- */
  _lowDir() {
    if (this._ldir) return this._ldir;
    if (!this.opposing || !this.arch) return -1;
    const cy = m => { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); return (g.boundingBox.min.y + g.boundingBox.max.y) / 2; };
    return (this._ldir = cy(this.opposing) < cy(this.arch) ? -1 : 1);
  }
  _applyBiteOffset() {
    if (!this.opposing || this._playing) return;
    const vdo = +this.getAttribute('vdo') || 0, bx = +this.getAttribute('bitex') || 0, bz = +this.getAttribute('bitez') || 0, d = this._lowDir();
    const key = vdo + '|' + bx + '|' + bz + '|' + (this.bite ? 1 : 0);
    if (key === this._lastBiteKey) return; this._lastBiteKey = key;
    for (const m of [this.opposing, this.bite]) if (m) m.position.set(bx, d * vdo, bz);
    this._dirty = true;
    clearTimeout(this._penT); this._penT = setTimeout(() => this.dispatchEvent(new CustomEvent('bite-state', { bubbles: true, composed: true, detail: this.bitePen() || { cells: 0, worst: 0 } })), 60);
  }
  bitePen() {
    if (!this.opposing) return null;
    const cell = 0.6, up = new Map(), lo = new Map(), key = (x, z) => Math.floor(x / cell) * 4096 + Math.floor(z / cell);
    const ua = this.arch.geometry.attributes.position.array, la = this.opposing.geometry.attributes.position.array, lowerBelow = this._lowDir() < 0;
    const dy = this.opposing.position.y, dx = this.opposing.position.x, dz = this.opposing.position.z;
    for (let i = 0; i < ua.length; i += 3) { const k = key(ua[i], ua[i + 2]); const y = ua[i + 1]; const c = up.get(k); if (c === undefined || (lowerBelow ? y < c : y > c)) up.set(k, y); }
    for (let i = 0; i < la.length; i += 3) { const k = key(la[i] + dx, la[i + 2] + dz); const y = la[i + 1] + dy; const c = lo.get(k); if (c === undefined || (lowerBelow ? y > c : y < c)) lo.set(k, y); }
    const pens = []; up.forEach((uy, k) => { const ly = lo.get(k); if (ly === undefined) return; const p = lowerBelow ? ly - uy : uy - ly; if (p > 0.02) pens.push(p); });
    pens.sort((a, b) => a - b);
    if (!pens.length) return { cells: 0, worst: 0 };
    return { cells: pens.length, worst: pens[Math.min(pens.length - 1, Math.floor(pens.length * 0.97))] };
  }
  deconflict() { const r = this.bitePen(); return r ? { before: r.worst, moved: r.worst, cells: r.cells } : null; }
  _drawLasso() {
    const c = this.shadowRoot.querySelector('.lassoc'); if (!c) return;
    const W = this.clientWidth || 800, H = this.clientHeight || 600; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'); x.clearRect(0, 0, W, H); const p = this._lasso; if (!p || p.length < 2) return;
    x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); x.closePath();
    x.fillStyle = 'rgba(155,123,255,.16)'; x.fill(); x.setLineDash([7, 5]); x.lineWidth = 1.6; x.strokeStyle = 'rgba(217,200,255,.95)'; x.stroke();
  }
  _trimLasso() {
    const poly = this._lasso; if (!poly || poly.length < 8) return;
    this._faceData(); this._pushUndo('trim');
    const W = this.clientWidth || 800, H = this.clientHeight || 600, F = this._idx0.length / 3;
    this.camera.updateMatrixWorld(); const m = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse).multiply(this.arch.matrixWorld), e = m.elements;
    if (!this._removed) this._removed = new Uint8Array(F);
    let n = 0;
    for (let f = 0; f < F; f++) {
      if (this._removed[f]) continue;
      const x = this._fc[f * 3], y = this._fc[f * 3 + 1], z = this._fc[f * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15]; if (w <= 0) continue;
      const px = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * 0.5 + 0.5) * W, py = (-(e[1] * x + e[5] * y + e[9] * z + e[13]) / w * 0.5 + 0.5) * H;
      let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) { this._removed[f] = 1; n++; }
    }
    if (n) this._rebuildArch();
  }
  _previewRing() {
    const tool = this.getAttribute('tool') || '';
    if (!this.ring || !tool || tool === 'free' || tool === 'trimlasso' || tool === 'move' || tool === 'trimtooth' || tool === 'xform' || tool === 'angles' || tool === 'cej' || tool === 'cutpln') return;
    const R = tool === 'trim' ? this._radius() * 1.5 : this._radius();
    const p = this._lastHitPt || this.center; if (!p) return;
    const dir = this.camera.position.clone().sub(p).normalize();
    this.ring.visible = true; this.ring.position.copy(p).addScaledVector(dir, 0.05);
    this.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); this.ring.scale.setScalar(R);
    clearTimeout(this._ringT); this._ringT = setTimeout(() => { if (!this._hovering && this.ring) this.ring.visible = false; }, 1500);
  }
  _toothGeo(n) {
    const p = this._prepPly, sg = p.seg; if (!sg) return null;
    this._tg = this._tg || {}; if (this._tg[n]) return this._tg[n];
    const out = [], ix = p.index; for (let i = 0; i < ix.length; i += 3) if (sg[ix[i]] === n && sg[ix[i + 1]] === n && sg[ix[i + 2]] === n) out.push(ix[i], ix[i + 1], ix[i + 2]);
    if (!out.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', this.arch.geometry.attributes.position); g.setIndex(new THREE.BufferAttribute(new Uint32Array(out), 1));
    return (this._tg[n] = g);
  }
  _mkHi(color, op) {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.renderOrder = 14; m.visible = false; this.rig.add(m); return m;
  }
  _showHi(mesh, n) { const g = n ? this._toothGeo(n) : null; if (!g) { mesh.visible = false; return; } mesh.geometry = g; mesh.visible = true; }
  _applyCopyFrom() {
    if (!this._ready) return;
    const n = +this.getAttribute('copyfrom') || 0;
    if (!this.copyHi) this.copyHi = this._mkHi(0x1ac065, 0.55);
    this._showHi(this.copyHi, n);
  }
  _toothAtEvent(e) {
    if (!this.arch || !this.arch.visible) return 0;
    const r = this.canvas.getBoundingClientRect(); this._raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hits = this._raycaster.intersectObject(this.arch, false); if (!hits.length) return 0;
    const f = hits[0].face, sg = this._prepPly.seg; return sg[f.a] === sg[f.b] ? sg[f.a] : sg[f.c] === sg[f.a] ? sg[f.a] : 0;
  }
  _hoverTooth(e) {
    const n = this._toothAtEvent(e), ok = n && n !== this._focusNum && n !== (+this.getAttribute('copyfrom') || 0);
    if (!this.hoverHi) this.hoverHi = this._mkHi(0xdcc8ff, 0.4);
    this._showHi(this.hoverHi, ok ? n : 0); this.style.cursor = n && n !== this._focusNum ? 'pointer' : '';
  }
  _pickTooth(e) {
    const n = this._toothAtEvent(e); if (!n || n === this._focusNum) return;
    this.dispatchEvent(new CustomEvent('tooth-pick', { bubbles: true, composed: true, detail: { tooth: n } }));
  }
  _hover(e) {
    const tool = this.getAttribute('tool') || '';
    if (!tool || tool === 'free' || tool === 'trimlasso' || tool === 'bitemove' || tool === 'xform' || tool === 'angles' || tool === 'cej' || tool === 'cutpln' || !this.ring) { if (this.ring) this.ring.visible = false; return; }
    const hit = this._pick(e);
    if (!hit) { this.ring.visible = false; this._hovering = false; return; }
    this._hovering = true; this._lastHitPt = hit.point.clone();
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    this.ring.visible = true;
    this.ring.position.copy(hit.point).addScaledVector(n, 0.05);
    this.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    this.ring.scale.setScalar(tool === 'move' ? 1.6 : tool === 'trim' ? this._radius() * 1.5 : tool === 'trimtooth' ? 4.6 : this._radius());
  }
  _beginEdit(hit, e, tool) {
    if (this.restoration) this._orig(this.restoration);
    this._pushUndo(tool === 'trim' || tool === 'trimtooth' ? 'trim' : undefined);
    if (tool === 'trimtooth') { this._edit = null; this._trimAt(hit, 4.6); return; }
    if (tool === 'cej') { const em = this._em(); this._cej = [em.worldToLocal(hit.point.clone())]; this._cejBase = null; this._edit = { tool, mode: 'cejtrace', lx: e.clientX, ly: e.clientY, mesh: em }; return; }
    if (tool === 'angles') {
      const em = this._em(), lp = em.worldToLocal(hit.point.clone()), mode = this.getAttribute('anglemode') || 'mark', L = this._las = this._las || [];
      if (mode === 'mark') { const ln = { a: lp.clone(), b: lp.clone(), preview: true }; if (L.length < 2) L.push(ln); else L[(this._laNext = ((this._laNext || 0) + 1) % 2)] = ln; this._edit = { tool, mode: 'lamark', lx: e.clientX, ly: e.clientY, mesh: em, line: ln }; return; }
      let best = null, bd = 2.2; const t3 = new THREE.Vector3();
      for (const ln of L) { const AB = ln.b.clone().sub(ln.a), L2 = AB.lengthSq() || 1, t = Math.max(0, Math.min(1, lp.clone().sub(ln.a).dot(AB) / L2)), d = lp.distanceTo(t3.copy(ln.a).addScaledVector(AB, t)); if (d < bd) { bd = d; best = ln; } }
      if (!best) { this._edit = null; return; }
      this._edit = { tool, mode: 'ladeform', lx: e.clientX, ly: e.clientY, mesh: em, line: best, orig: em.geometry.attributes.position.array.slice(), norm: em.geometry.attributes.normal.array.slice(), amt: 0 }; return;
    }
    const brush = this.getAttribute('brush') || 'addsoft';
    const ed = this._edit = { tool, brush, lx: e.clientX, ly: e.clientY };
    if (tool === 'trim') { ed.mode = 'trim'; this._trimAt(hit); return; }
    if (tool === 'move') { ed.mode = 'move'; return; }
    if (tool === 'free') { ed.mode = 'free'; this.canvas.style.cursor = 'grabbing'; return; }
    const em = this._em();
    if (tool === 'pull' || brush === 'morph') {
      const pos = em.geometry.attributes.position, a = pos.array, R = this._radius();
      const lp = em.worldToLocal(hit.point.clone());
      ed.mode = 'pull'; ed.idx = []; ed.w = []; ed.orig = a.slice(); ed.total = new THREE.Vector3(); ed.mesh = em;
      for (let i = 0; i < pos.count; i++) {
        const dx = a[i * 3] - lp.x, dy = a[i * 3 + 1] - lp.y, dz = a[i * 3 + 2] - lp.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < R * 1.2) { const f = 1 - d / (R * 1.2); ed.idx.push(i); ed.w.push(f * f * (3 - 2 * f)); }
      }
      return;
    }
    ed.mode = 'brush';
    this._applyBrush(hit);
  }
  _moveEdit(e) {
    const ed = this._edit; if (!ed) return;
    const dx = e.clientX - ed.lx, dy = e.clientY - ed.ly; ed.lx = e.clientX; ed.ly = e.clientY;
    if (ed.mode === 'trim') { const h = this._pick(e); if (h) { this._trimAt(h); this._hover(e); } return; }
    if (ed.mode === 'cejtrace') { const h = this._pick(e); if (h) { const p = ed.mesh.worldToLocal(h.point.clone()), last = this._cej[this._cej.length - 1]; if (p.distanceTo(last) > 0.45) this._cej.push(p); } return; }
    if (ed.mode === 'lamark') { const h = this._pick(e); if (h) ed.line.b.copy(ed.mesh.worldToLocal(h.point.clone())); return; }
    if (ed.mode === 'ladeform') {
      const kk = this._perPixel(); ed.amt = Math.max(-1.8, Math.min(1.8, ed.amt + dx * kk * 0.5));
      const em = ed.mesh, a = em.geometry.attributes.position.array, A = ed.line.a, B = ed.line.b, AB = B.clone().sub(A), L2 = AB.lengthSq() || 1, R = 1.1, shape = this.getAttribute('angleshape') || 'even', p = new THREE.Vector3();
      for (let i = 0, n = a.length / 3; i < n; i++) {
        p.set(ed.orig[i * 3], ed.orig[i * 3 + 1], ed.orig[i * 3 + 2]);
        const t = Math.max(0, Math.min(1, p.clone().sub(A).dot(AB) / L2)), d = p.distanceTo(A.clone().addScaledVector(AB, t));
        if (d >= R) { a[i * 3] = ed.orig[i * 3]; a[i * 3 + 1] = ed.orig[i * 3 + 1]; a[i * 3 + 2] = ed.orig[i * 3 + 2]; continue; }
        const f = 1 - d / R, w = f * f * (3 - 2 * f) * (shape === 'asym' ? 0.2 + 0.8 * t : shape === 'sym' ? 0.4 + 0.6 * Math.sin(Math.PI * t) : 1);
        a[i * 3] = ed.orig[i * 3] + ed.norm[i * 3] * ed.amt * w; a[i * 3 + 1] = ed.orig[i * 3 + 1] + ed.norm[i * 3 + 1] * ed.amt * w; a[i * 3 + 2] = ed.orig[i * 3 + 2] + ed.norm[i * 3 + 2] * ed.amt * w;
      }
      this._refreshMesh(em); return;
    }
    const k = this._perPixel();
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    const delta = right.multiplyScalar(dx * k).addScaledVector(up, -dy * k);
    if (ed.mode === 'free') {
      const inv = this.rig.matrixWorld.clone().invert(), o = new THREE.Vector3(0, 0, 0).applyMatrix4(inv), d = delta.clone().applyMatrix4(inv).sub(o);
      this.restoration.position.add(d); this._freeOff = (this._freeOff || new THREE.Vector3()).add(d); this._dirty = true; return;
    }
    if (ed.mode === 'move') {
      this._userOffset.add(delta);
      if (this._userOffset.length() > 3) this._userOffset.setLength(3);
      this._applyTemplate(); return;
    }
    if (ed.mode === 'pull') {
      ed.total.add(delta);
      if (ed.total.length() > 1.6) ed.total.setLength(1.6);
      const em = ed.mesh, a = em.geometry.attributes.position.array, sc = em.scale;
      for (let j = 0; j < ed.idx.length; j++) {
        const i = ed.idx[j], w = ed.w[j];
        a[i * 3] = ed.orig[i * 3] + ed.total.x * w / sc.x;
        a[i * 3 + 1] = ed.orig[i * 3 + 1] + ed.total.y * w / sc.y;
        a[i * 3 + 2] = ed.orig[i * 3 + 2] + ed.total.z * w / sc.z;
      }
      this._refreshMesh(em); return;
    }
    const hit = this._pick(e);
    if (hit) { this._applyBrush(hit); this._hover(e); }
  }
  _endEdit() { if (this._edit && this._edit.mode === 'cejtrace') this.dispatchEvent(new CustomEvent('cej-curve', { bubbles: true, composed: true, detail: this._cej.length > 1 }));
    const wasLa = this._edit && this._edit.mode === 'lamark'; if (wasLa && this._edit.line) { this._edit.line.preview = false; this._dirty = true; } this._edit = null; if (wasLa) this.dispatchEvent(new CustomEvent('la-line', { bubbles: true, composed: true, detail: true })); this.dispatchEvent(new CustomEvent('crown-edit', { bubbles: true, composed: true })); this._metrics(); }
  _metrics() {
    const R0 = this.restoration; if (!R0 || !R0.userData.orig) return;
    const g = R0.geometry, P = g.attributes.position.array, O = R0.userData.orig, N = g.attributes.normal ? g.attributes.normal.array : null, n = P.length / 3;
    let y0 = 1e9, y1 = -1e9; for (let i = 0; i < n; i++) { const y = O[i * 3 + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cut = y0 + (y1 - y0) * 0.2; let out = 0, inn = 0, abs = 0, cerv = 0;
    for (let i = 0; i < n; i++) {
      const dx = P[i * 3] - O[i * 3], dy = P[i * 3 + 1] - O[i * 3 + 1], dz = P[i * 3 + 2] - O[i * 3 + 2], a = Math.hypot(dx, dy, dz); if (a < 1e-4) continue;
      const sg = N ? dx * N[i * 3] + dy * N[i * 3 + 1] + dz * N[i * 3 + 2] : a;
      if (a > abs) abs = a; if (sg > out) out = sg; if (-sg > inn) inn = -sg; if (O[i * 3 + 1] < cut && sg > cerv) cerv = sg;
    }
    this.dispatchEvent(new CustomEvent('crown-metrics', { bubbles: true, composed: true, detail: { out, inn, abs, cerv } }));
  }
  _cloud(kind, em) {
    this._clouds = this._clouds || {};
    if (this._clouds[kind]) return this._clouds[kind];
    let src = null;
    if (kind === 'opposing') { if (!this.opposing) { this._ensureOpposing(); return null; } const g = this.opposing.geometry.attributes.position.array, out = []; this.opposing.updateWorldMatrix(true, false); const m = this.opposing.matrixWorld, p = new THREE.Vector3(); for (let i = 0; i < g.length / 3; i += 6) { p.set(g[i * 3], g[i * 3 + 1], g[i * 3 + 2]).applyMatrix4(m); em.worldToLocal(p); out.push(p.x, p.y, p.z); } src = new Float32Array(out); }
    else if (kind === 'preop' || kind === 'contra') {
      const r = this._preopRef; if (!r) return null; const out = [];
      let x0 = 1e9, x1 = -1e9; for (let i = 0; i < r.length; i += 3) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); }
      for (let i = 0; i < r.length / 3; i += 2) out.push(kind === 'contra' ? x0 + x1 - r[i * 3] : r[i * 3], r[i * 3 + 1], r[i * 3 + 2]);
      src = new Float32Array(out);
    }
    return (this._clouds[kind] = src);
  }
  _nearest(c, x, y, z) { let b = 1e18, bi = 0; for (let j = 0; j < c.length; j += 3) { const dx = c[j] - x, dy = c[j + 1] - y, dz = c[j + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < b) { b = d; bi = j; } } return [bi, Math.sqrt(b)]; }
  _applyBrush(hit) {
    const em = this._em(), geo = em.geometry, pos = geo.attributes.position, a = pos.array, nn = geo.attributes.normal.array;
    const orig = this._orig(em), lp = em.worldToLocal(hit.point.clone()), hn = hit.face.normal;
    const R = this._radius(), S = this._strength(), brush = this._edit.brush;
    const adj = brush === 'smooth' ? this._adjacency(em) : null;
    const cloud = (brush === 'opposing' || brush === 'preop' || brush === 'contra') ? this._cloud(brush, em) : null, clr = +this.getAttribute('brushc') || 0.5;
    if ((brush === 'opposing' || brush === 'preop' || brush === 'contra') && !cloud) return;
    const snap = brush === 'smooth' ? a.slice() : null;
    for (let i = 0; i < pos.count; i++) {
      const x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2];
      const dx = x - lp.x, dy = y - lp.y, dz = z - lp.z;
      const d2 = dx * dx + dy * dy + dz * dz; if (d2 > R * R) continue;
      const f = 1 - Math.sqrt(d2) / R, w = f * f * (3 - 2 * f);
      let nx = x, ny = y, nz = z;
      if (brush === 'add' || brush === 'sub' || brush === 'addsoft') {
        const kk = (brush === 'sub' ? -0.1 : brush === 'add' ? 0.1 : 0.055) * S * (brush === 'addsoft' ? f : w);
        nx += nn[i * 3] * kk; ny += nn[i * 3 + 1] * kk; nz += nn[i * 3 + 2] * kk;
      } else if (brush === 'smooth') {
        const nb = adj[i]; if (!nb.length) continue;
        let sx = 0, sy = 0, sz = 0;
        for (let q = 0; q < nb.length; q++) { sx += snap[nb[q] * 3]; sy += snap[nb[q] * 3 + 1]; sz += snap[nb[q] * 3 + 2]; }
        const t = Math.min(1, 0.7 * S * w);
        nx += (sx / nb.length - x) * t; ny += (sy / nb.length - y) * t; nz += (sz / nb.length - z) * t;
      } else if (brush === 'opposing') {
        const [bj, d] = this._nearest(cloud, x, y, z);
        if (d < clr) { let ux = x - cloud[bj], uy = y - cloud[bj + 1], uz = z - cloud[bj + 2]; const ul = Math.hypot(ux, uy, uz) || 1, k = (clr - d) * Math.min(1, S * 1.4) * w / ul; nx += ux * k; ny += uy * k; nz += uz * k; }
      } else if (brush === 'preop' || brush === 'contra') {
        const [bj] = this._nearest(cloud, x, y, z), t = Math.min(1, S * w * 0.5);
        nx += (cloud[bj] - x) * t; ny += (cloud[bj + 1] - y) * t; nz += (cloud[bj + 2] - z) * t;
      } else if (brush === 'flatten') {
        const dist = dx * hn.x + dy * hn.y + dz * hn.z, t = 0.45 * S * w;
        nx -= hn.x * dist * t; ny -= hn.y * dist * t; nz -= hn.z * dist * t;
      } else if (brush === 'pinch') {
        let vx = -dx, vy = -dy, vz = -dz; const pr = vx * hn.x + vy * hn.y + vz * hn.z;
        vx -= hn.x * pr; vy -= hn.y * pr; vz -= hn.z * pr;
        const t = 0.1 * S * w; nx += vx * t; ny += vy * t; nz += vz * t;
      }
      const ox = nx - orig[i * 3], oy = ny - orig[i * 3 + 1], oz = nz - orig[i * 3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      if (len > 1.5) { const s2 = 1.5 / len; nx = orig[i * 3] + ox * s2; ny = orig[i * 3 + 1] + oy * s2; nz = orig[i * 3 + 2] + oz * s2; }
      a[i * 3] = nx; a[i * 3 + 1] = ny; a[i * 3 + 2] = nz;
    }
    this._refreshMesh(em);
  }

  _patchReveal(mat) {
    const self = this;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uRev = self._uRev; sh.uniforms.uRes = self._uRes;
      sh.fragmentShader = 'uniform float uRev;\nuniform vec2 uRes;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n float ed_ = smoothstep(uRev - 0.05, uRev, gl_FragCoord.x / uRes.x); gl_FragColor.a *= mix(1.0, 0.06, ed_);');
    };
    mat.customProgramCacheKey = () => 'rev';
  }
  async playAutomation(mode) {
    if (!this._ready) return;
    const token = this._playToken = (this._playToken || 0) + 1;
    if (mode === 'trim' && !this.trimmedGhost) {
      this._ensureTrimmed();
      for (let i = 0; i < 60 && !this.trimHead; i++) await new Promise(r => setTimeout(r, 50));
    }
    if (mode === 'bite' && !this.opposing) {
      this._ensureOpposing();
      for (let i = 0; i < 80 && !this.opposing; i++) await new Promise(r => setTimeout(r, 50));
    }
    if (token !== this._playToken) return;
    this._playing = true;
    const meshes = [this.arch, this.prepTooth, this.opposing].filter(Boolean);
    meshes.forEach(m => { m.material.transparent = true; m.material.depthWrite = false; m.material.needsUpdate = true; });
    const ghost = mode === 'trim' ? this.trimmedGhost : null, line = ghost && ghost.children[0], head = this.trimHead;
    const finalFill = this.getAttribute('trimrev') ? 0 : 0.5, t0 = performance.now();
    const ease = k => 1 - Math.pow(1 - k, 2.2), inout = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const done = () => {
      this._uRev.value = 5; this.whoosh.style.opacity = '0'; this._playing = false;
      if (ghost) { ghost.geometry.setDrawRange(0, Infinity); line.geometry.setDrawRange(0, Infinity); ghost.material.opacity = finalFill; line.material.opacity = 0.95; if (head) head.visible = false; }
      if (this.trimmedGhost && this.getAttribute('trimhide')) this.trimmedGhost.visible = false;
      this._applyScanStyle(); this._applyGhost();
    };
    if (mode === 'bite' && this.opposing) {
      const lows = [this.opposing, this.bite].filter(Boolean), ups = [this.arch, this.prepTooth], baseL = lows.map(m => m.position.clone());
      const cyOf = m => { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); return (g.boundingBox.min.y + g.boundingBox.max.y) / 2; };
      const dir = cyOf(this.opposing) < cyOf(this.arch) ? -1 : 1;
      const OPEN = 7, HOLD = 500, CLOSE = 560, OVER = 0.4, SETTLE = 240, FLASH = 800;
      const mats = meshes.map(m => m.material), flash = k => mats.forEach(m => m.emissive && m.emissive.setRGB(0.1 * k, 0.8 * k, 0.45 * k));
      const place = (gap, dx) => lows.forEach((m, i) => m.position.copy(baseL[i]).add(new THREE.Vector3(dx, dir * gap, 0)));
      const ease = k => 1 - Math.pow(1 - k, 3);
      mats.forEach(m => { m.opacity = 0.2; });
      const step = () => {
        if (token !== this._playToken) return;
        const t = performance.now() - t0;
        if (t < HOLD) { place(OPEN + Math.sin(t * 0.03) * 0.22, 1.3); requestAnimationFrame(step); }
        else if (t < HOLD + CLOSE) { const k = (t - HOLD) / CLOSE, e = k * k * k; place(OPEN * (1 - e) - OVER * e, 1.3 * (1 - e)); requestAnimationFrame(step); }
        else if (t < HOLD + CLOSE + SETTLE) { const k = (t - HOLD - CLOSE) / SETTLE; place(-OVER * (1 - ease(k)), 0); flash(k); requestAnimationFrame(step); }
        else if (t < HOLD + CLOSE + SETTLE + FLASH) { const k = 1 - (t - HOLD - CLOSE - SETTLE) / FLASH; place(0, 0); flash(Math.max(0, k)); requestAnimationFrame(step); }
        else { lows.forEach((m, i) => m.position.copy(baseL[i])); flash(0); mats.forEach(m => { m.opacity = 1; m.transparent = false; m.depthWrite = true; m.needsUpdate = true; }); done(); }
      };
      requestAnimationFrame(step); return;
    }
    if (mode === 'trim' && ghost) {
      const FADE = 650, TRACK = 1900, F = this._trimF.length / 3, S = this._trimS;
      ghost.material.opacity = finalFill; line.material.opacity = 0.95; ghost.geometry.setDrawRange(0, 0); line.geometry.setDrawRange(0, 0);
      const step = () => {
        if (token !== this._playToken) return;
        const t = performance.now() - t0;
        if (t < FADE) { const k = inout(t / FADE); meshes.forEach(m => { m.material.opacity = 0.07 + 0.93 * k; }); requestAnimationFrame(step); }
        else if (t < FADE + TRACK) {
          meshes.forEach(m => { m.material.opacity = 1; });
          const p = inout((t - FADE) / TRACK), n = Math.max(1, Math.floor(p * F));
          ghost.geometry.setDrawRange(0, n * 3); line.geometry.setDrawRange(0, Math.max(2, Math.floor(p * S) * 2));
          head.visible = true; head.material.opacity = 1; head.position.set(0, 0, 0);
          const i = Math.min(F - 1, n - 1); head.geometry.attributes.position.setXYZ(0, this._trimF[i * 3], this._trimF[i * 3 + 1], this._trimF[i * 3 + 2]); head.geometry.attributes.position.needsUpdate = true; head.geometry.computeBoundingSphere();
          requestAnimationFrame(step);
        } else done();
      };
      requestAnimationFrame(step); return;
    }
    if (mode === 'margin' && this.margin && this.margin.children[0]) {
      const ml = this.margin.children[0], g = ml.geometry; g.computeBoundingBox();
      const bb = g.boundingBox, ctr = bb.getCenter(new THREE.Vector3()), size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
      this.rig.localToWorld(ctr);
      const sph = this._sph, tgt = this._target, T0 = tgt.clone(), R0 = sph.radius, r1 = Math.max(9, size * 2.7), total = g.attributes.position.count, wasVis = this.margin.visible;
      const ZIN = 850, DRAW = 1800, HOLD = 400, ZOUT = 800, gok = (k) => k * k * (3 - 2 * k);
      const cleanup = () => { g.setDrawRange(0, Infinity); this.margin.visible = wasVis; sph.radius = R0; tgt.copy(T0); this._dirty = true; };
      this.margin.visible = true; g.setDrawRange(0, 0);
      const stepM = () => {
        if (token !== this._playToken) { cleanup(); return; }
        const t = performance.now() - t0; this._dirty = true;
        if (t < ZIN) { const k = gok(t / ZIN); sph.radius = R0 + (r1 - R0) * k; tgt.lerpVectors(T0, ctr, k); }
        else if (t < ZIN + DRAW) { sph.radius = r1; tgt.copy(ctr); const p = (t - ZIN) / DRAW; g.setDrawRange(0, Math.max(2, Math.floor(p * total / 2) * 2)); }
        else if (t < ZIN + DRAW + HOLD) { g.setDrawRange(0, Infinity); }
        else if (t < ZIN + DRAW + HOLD + ZOUT) { const k = gok((t - ZIN - DRAW - HOLD) / ZOUT); sph.radius = r1 + (R0 - r1) * k; tgt.lerpVectors(ctr, T0, k); }
        else { cleanup(); done(); return; }
        requestAnimationFrame(stepM);
      };
      requestAnimationFrame(stepM); return;
    }
    if (mode === 'poi' && this.axis) {
      const ax = this.axis, pos = ax.geometry.attributes.position, p0 = new THREE.Vector3().fromBufferAttribute(pos, 0), p1 = new THREE.Vector3().fromBufferAttribute(pos, 1), ring = ax.children[0];
      const ringP = ring.position.clone(), wasVis = ax.visible, sph = this._sph, tgt = this._target, R0 = sph.radius, T0 = tgt.clone(), th0 = sph.theta, ph0 = sph.phi;
      const c = this.center.clone(); this.rig.localToWorld(c);
      const th1 = this._frontTheta() + 0.55, ph1 = 1.22, r1 = Math.max(24, R0 * 0.75);
      const CAM = 800, INS = 1700, PULSE = 450, BACK = 800, gok = (k) => k * k * (3 - 2 * k);
      const setCam = (k, a, b) => { sph.theta = a.th + (b.th - a.th) * k; sph.phi = a.ph + (b.ph - a.ph) * k; sph.radius = a.r + (b.r - a.r) * k; tgt.lerpVectors(a.t, b.t, k); };
      const A = { th: th0, ph: ph0, r: R0, t: T0 }, B = { th: th1, ph: ph1, r: r1, t: c };
      const setEnd = (k) => { const e = p0.clone().lerp(p1, k); pos.setXYZ(1, e.x, e.y, e.z); pos.needsUpdate = true; ax.computeLineDistances(); ring.position.copy(p0.clone().lerp(ringP, k)); };
      const cleanup = () => { pos.setXYZ(1, p1.x, p1.y, p1.z); pos.needsUpdate = true; ax.computeLineDistances(); ring.position.copy(ringP); ring.scale.setScalar(1); ax.visible = wasVis; sph.theta = th0; sph.phi = ph0; sph.radius = R0; tgt.copy(T0); this._dirty = true; };
      ax.visible = true; ax.frustumCulled = false; setEnd(0);
      const stepI = () => {
        if (token !== this._playToken) { cleanup(); return; }
        const t = performance.now() - t0; this._dirty = true;
        if (t < CAM) { setCam(gok(t / CAM), A, B); setEnd(0); }
        else if (t < CAM + INS) { setCam(1, A, B); setEnd(gok((t - CAM) / INS)); }
        else if (t < CAM + INS + PULSE) { setEnd(1); ring.scale.setScalar(1 + 0.3 * Math.sin(Math.PI * (t - CAM - INS) / PULSE)); }
        else if (t < CAM + INS + PULSE + BACK) { setEnd(1); ring.scale.setScalar(1); setCam(gok((t - CAM - INS - PULSE) / BACK), B, A); }
        else { cleanup(); done(); return; }
        requestAnimationFrame(stepI);
      };
      requestAnimationFrame(stepI); return;
    }
    if (mode === 'source' && this.prepTooth) {
      const rp = this._scanRect(this.prepTooth, 14), SW = 1100, wp = Math.max(30, (rp.r - rp.l) * 0.4);
      Object.assign(this.whoosh.style, { top: rp.t + 'px', bottom: 'auto', height: (rp.b - rp.t) + 'px', width: wp + 'px' });
      const stepP = () => {
        if (token !== this._playToken) return;
        const t = performance.now() - t0;
        if (t < SW) {
          const k = inout(t / SW), x = rp.l + k * (rp.r - rp.l) + wp * 0.3;
          this.whoosh.style.opacity = String(Math.sin(Math.PI * k)); this.whoosh.style.transform = 'translateX(' + (x - wp) + 'px) skewX(-14deg)';
          requestAnimationFrame(stepP);
        } else done();
      };
      requestAnimationFrame(stepP); return;
    }
    const rc = this._scanRect(), SWEEP = 1500, wd = Math.max(46, (rc.r - rc.l) * 0.16);
    Object.assign(this.whoosh.style, { top: rc.t + 'px', bottom: 'auto', height: (rc.b - rc.t) + 'px', width: wd + 'px' });
    const step = () => {
      if (token !== this._playToken) return;
      const t = performance.now() - t0;
      if (t < SWEEP) {
        const x = rc.l - wd * 0.2 + inout(t / SWEEP) * ((rc.r - rc.l) + wd * 0.4);
        this._uRev.value = x / rc.W; this.whoosh.style.opacity = '1'; this.whoosh.style.transform = 'translateX(' + (x - wd) + 'px) skewX(-14deg)';
        requestAnimationFrame(step);
      } else done();
    };
    requestAnimationFrame(step);
  }

  _applyGhost() {
    const on = !!this.getAttribute('ghost');
    for (const m of [this.arch, this.prepTooth, this.opposing]) {
      if (!m) continue; const mat = m.material, u = m.userData;
      if (!u.ghostSaved) u.ghostSaved = { o: mat.opacity, t: mat.transparent, d: mat.depthWrite };
      if (on) { mat.opacity = 0.26; mat.transparent = true; mat.depthWrite = false; if (mat.emissive) { if (m === this.opposing) mat.emissive.setRGB(0.32, 0.14, 0.02); else mat.emissive.setRGB(0.02, 0.12, 0.34); } }
      else { mat.opacity = u.ghostSaved.o; mat.transparent = u.ghostSaved.t; mat.depthWrite = u.ghostSaved.d; if (mat.emissive) mat.emissive.setRGB(0, 0, 0); }
      mat.needsUpdate = true;
    }
  }
  shakeAlign() {
    const up = [this.arch, this.prepTooth].filter(Boolean), lo = [this.opposing, this.bite].filter(Boolean);
    if (!up.length) return 0;
    if (this._shaking) return 0;
    this._shaking = true;
    const baseU = up.map(m => m.position.clone()), baseL = lo.map(m => m.position.clone());
    const t0 = performance.now(), SHAKE = 1100, SNAP = 320;
    const jit = (t, a, ph) => new THREE.Vector3(Math.sin(t * 0.047 + ph) * a, Math.sin(t * 0.061 + ph * 2) * a * 0.55, Math.cos(t * 0.053 + ph * 3) * a);
    const set = (offU, offL) => { up.forEach((m, i) => m.position.copy(baseU[i]).add(offU)); lo.forEach((m, i) => m.position.copy(baseL[i]).add(offL)); };
    const step = () => {
      const t = performance.now() - t0;
      if (t < SHAKE) { const a = 1.5 * (1 - 0.45 * t / SHAKE); set(jit(t, a * 0.5, 0), jit(t, a, 2)); requestAnimationFrame(step); }
      else if (t < SHAKE + SNAP) { const k = (t - SHAKE) / SNAP, e = 1 - Math.pow(1 - k, 3), last = jit(SHAKE, 0.8, 2), lastU = jit(SHAKE, 0.4, 0); set(lastU.multiplyScalar(1 - e), last.multiplyScalar(1 - e)); requestAnimationFrame(step); }
      else { set(new THREE.Vector3(), new THREE.Vector3()); this._shaking = false; }
    };
    requestAnimationFrame(step);
    return SHAKE + SNAP;
  }

  _applyScanStyle() {
    const TINT = {
      natural: null,
      plaster: 0xEDE9E0,
      green: 0x7FA88C,
      amber: 0xD2A857,
      blue: 0x8FA8C8,
    };
    const targets = {
      prep: [this.arch, this.prepTooth],
      lower: [this.opposing],
      preop: [this.preopArch],
      bite: [this.bite],
      bite2: [this.bite],
      lowerfull: [this.opposing],
    };
    const spec = (this.getAttribute('scanstyle') || '').split(';').filter(Boolean);
    for (const entry of spec) {
      const [id, op, tint] = entry.split(':');
      const meshes = targets[id];
      if (!meshes) continue;
      for (const m of meshes) {
        if (!m) continue;
        const mat = m.material;
        const o = Math.max(0.05, Math.min(1, (+op || 100) / 100));
        mat.opacity = o;
        mat.transparent = o < 1;
        mat.depthWrite = o > 0.92;
        const hex = TINT[tint];
        if (hex == null) {
          mat.vertexColors = true;
          mat.color.setHex(0xffffff);
        } else {
          mat.vertexColors = false;
          mat.color.setHex(hex);
        }
        mat.needsUpdate = true;
      }
    }
    this._dirty = true;
  }

  _loop() {
    const tick = () => {
      if (this._stop) return;
      requestAnimationFrame(tick);
      if (!this._ready) { this.renderer.render(this.scene, this.camera); return; }
      const s = this._sph;
      const p = new THREE.Vector3(
        s.radius * Math.sin(s.phi) * Math.sin(s.theta),
        s.radius * Math.cos(s.phi),
        s.radius * Math.sin(s.phi) * Math.cos(s.theta)
      ).add(this._target);
      this._uRes.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
      this._genFx(); this._mimicFx(); this._xfUpdate(); this._laUpdate(); this._cejUpdate(); this._mcTick(); this._mUpdate(); this._cutUpdate(); this._thkUpdate();
      this.camera.position.lerp(p, this._camLerp || 0.18);
      this.camera.lookAt(this._target);
      this.headlight.position.copy(this.camera.position);
      this._vizFrame(); this.renderer.render(this.scene, this.camera);
      this._project(); this._vizOverlay();
      this._drawRef();
      { const z = Math.round(70 / Math.max(1, this.camera.position.distanceTo(this._target)) * 1000) / 1000; if (z !== this._zoomV) { this._zoomV = z; const pe = this.parentElement; if (pe) pe.style.setProperty('--cam-scale', String(z)); } }
    };
    tick();
  }

  _refPoints() {
    const out = [], add = (ply, mesh, tag) => {
      if (!ply || !ply.seg || !mesh) return;
      const mn = new Map(), mx = new Map(), P = ply.position;
      for (let i = 0; i < ply.seg.length; i++) {
        const g = ply.seg[i]; if (g < 1 || g > 32) continue;
        const y = P[i * 3 + 1], a = mn.get(g), b = mx.get(g);
        if (!a || y < a[0]) mn.set(g, [y, i]); if (!b || y > b[0]) mx.set(g, [y, i]);
      }
      mn.forEach((v, g) => { const i = v[1], j = mx.get(g)[1]; if (Math.abs(P[i * 3 + 1] - P[j * 3 + 1]) < 3) return;
        out.push({ key: tag + g + 'a', mesh, p: new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) }, { key: tag + g + 'b', mesh, p: new THREE.Vector3(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]) }); });
    };
    add(this._prepPly, this.arch, 'u');
    if (this.opposing && this.opposing.visible) add(this._lowerPly, this.opposing, 'l');
    return out;
  }
  _refHit(e) {
    const L = !!this.getAttribute('refline'), M = !!this.getAttribute('refmarkers'); if (!L && !M) return null;
    const r = this.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (M && this._refScreen) { let best = null, bd = 100; for (const q of this._refScreen) { const d = (q.px - x) * (q.px - x) + (q.py - y) * (q.py - y); if (d < bd) { bd = d; best = q; } } if (best) return { type: 'marker', key: best.key }; }
    if (L && Math.abs(y - (this._refY ?? 0.42) * r.height) < 8) return { type: 'refline' };
    return null;
  }
  _drawRef() {
    const c = this.shadowRoot.querySelector('.refc'); if (!c) return;
    const L = !!this.getAttribute('refline'), M = !!this.getAttribute('refmarkers');
    if (!L && !M) { if (this._refDrawn) { const x0 = c.getContext('2d'); x0.clearRect(0, 0, c.width, c.height); this._refDrawn = false; this._refScreen = null; } return; }
    this._refDrawn = true;
    const W = this.clientWidth || 800, H = this.clientHeight || 600; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
    const ly = (this._refY ?? 0.42) * H, v = new THREE.Vector3(), scr = [];
    if (M && this.arch) {
      if (!this._refPts || this._refPtsN !== (this.opposing && this.opposing.visible ? 1 : 0)) { this._refPts = this._refPoints(); this._refPtsN = this.opposing && this.opposing.visible ? 1 : 0; }
      this.camera.updateMatrixWorld();
      for (const q of this._refPts) {
        q.mesh.updateWorldMatrix(true, false);
        v.copy(q.p).applyMatrix4(q.mesh.matrixWorld); const o = this._refOv && this._refOv.get(q.key); if (o) v.add(o);
        v.project(this.camera); if (v.z > 1) continue;
        const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H; scr.push({ key: q.key, px, py });
      }
    }
    this._refScreen = scr;
    if (L) { x.strokeStyle = 'rgba(125,211,252,.95)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, ly); x.lineTo(W, ly); x.stroke(); }
    for (const q of scr) {
      const dy = Math.abs(q.py - ly); let col = '#1E6BFF', rr = 4.2;
      if (L) { if (dy <= 3) { col = '#1AC065'; rr = 5.2; } else if (dy <= 18) { col = '#FF5C5C'; rr = 5; } }
      x.beginPath(); x.arc(q.px, q.py, rr, 0, 6.2832); x.fillStyle = col; x.fill(); x.lineWidth = 1.2; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
    }
  }
  _antRect() {
    const pl = this._prepPly; if (!pl) return null;
    if (!this._antPts) { const a = []; if (pl.seg) for (let i = 0; i < pl.seg.length; i += 2) { const g = pl.seg[i]; if (g >= 6 && g <= 11) a.push(pl.position[i * 3], pl.position[i * 3 + 1], pl.position[i * 3 + 2]); } this._antPts = a.length > 30 ? new Float32Array(a) : null; }
    const W = this.clientWidth || 800, H = this.clientHeight || 600, v = new THREE.Vector3(); let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
    this.arch.updateWorldMatrix(true, false); this.camera.updateMatrixWorld();
    const P = this._antPts, g = this.arch.geometry; if (!P) return null;
    for (let i = 0; i < P.length; i += 3) { v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(this.arch.matrixWorld).project(this.camera); const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H; if (px < l) l = px; if (px > r) r = px; if (py < t) t = py; if (py > b) b = py; }
    return { cx: (l + r) / 2, cy: (t + b) / 2, w: r - l };
  }
  autoAlign(spec) {
    if (!this._ready || !this.arch || !spec) return false;
    const W = this.clientWidth || 800, H = this.clientHeight || 600, Hc = H - 56;
    let iw, ih; if (W / Hc > spec.ar) { ih = Hc; iw = Hc * spec.ar; } else { iw = W; ih = W / spec.ar; }
    iw *= spec.z || 1; ih *= spec.z || 1;
    const tx = W / 2 + (spec.mx - 0.5) * iw, ty = Hc / 2 + (spec.my - 0.5) * ih, tw = spec.mw * iw;
    const startPos = this.camera.position.clone(), sph = this._sph, F = VIEWS.front;
    this._goView('front');
    const place = () => { sph.theta = sph.theta; this.camera.position.set(sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta), sph.radius * Math.cos(sph.phi), sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta)).add(this._target); this.camera.lookAt(this._target); this.camera.updateMatrixWorld(); };
    for (let it = 0; it < 3; it++) {
      place(); const q = this._antRect(); if (!q || q.w < 2) break;
      sph.radius = Math.max(14, Math.min(900, sph.radius * q.w / tw)); place();
      const q2 = this._antRect(); if (!q2) break;
      const k = 2 * this.camera.position.distanceTo(this._target) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / H;
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
      this._target.addScaledVector(right, -(tx - q2.cx) * k).addScaledVector(up, (ty - q2.cy) * k);
    }
    this.camera.position.copy(startPos); this._camLerp = 0.06; this._dirty = true;
    clearTimeout(this._alT); this._alT = setTimeout(() => { this._camLerp = 0; this.dispatchEvent(new CustomEvent('auto-aligned', { bubbles: true, composed: true })); }, 1700);
    return true;
  }
  _computeAutoAnchor() {
    const g = this.trimmedGhost; if (!g || !g.visible) return;
    const a = g.geometry.attributes.position.array, [tx, ty] = this._anchorAuto, p = this._tmpV || (this._tmpV = new THREE.Vector3());
    let bi = -1, bd = 1e9;
    for (let i = 0; i < a.length / 3; i += 2) { p.set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]).project(this.camera); if (p.z > 1) continue; const d = (p.x - tx) * (p.x - tx) + (p.y - ty) * (p.y - ty); if (d < bd) { bd = d; bi = i; } }
    if (bi >= 0) this._anchorPt = new THREE.Vector3(a[bi * 3], a[bi * 3 + 1], a[bi * 3 + 2]);
  }
  _project() {
    if (!this.center) return;
    if (this._anchorAuto) { this._af = (this._af || 0) + 1; if (this._af % 20 === 1) this._computeAutoAnchor(); }
    const v = (this._anchorPt || this.center).clone().project(this.camera);
    const w = this.clientWidth, h = this.clientHeight;
    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    if (Math.abs(x - (this._ax || 0)) > 0.6 || Math.abs(y - (this._ay || 0)) > 0.6) {
      this._ax = x; this._ay = y;
      this.style.setProperty('--anchor-x', x.toFixed(1) + 'px');
      this.style.setProperty('--anchor-y', y.toFixed(1) + 'px');
      this.style.setProperty('--anchor-flip', y > h * 0.5 ? '1' : '0');
    }
  }

  setView(name) { this.setAttribute('view', name); }
}

customElements.define('scan-viewer', ScanViewer);
