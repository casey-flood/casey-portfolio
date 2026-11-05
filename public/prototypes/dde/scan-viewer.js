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
};

class ScanViewer extends HTMLElement {
  static get observedAttributes() { return ['view', 'layers', 'focus', 'crowntpl', 'scanstyle']; }

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
    </style><canvas></canvas><div class="status">Loading scans</div><slot></slot>`;
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

  disconnectedCallback() { this._stop = true; if (this._ro) this._ro.disconnect(); }

  _setup() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.getAttribute('background') || '#0B1F1B');
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 2000);

    scene.add(new THREE.HemisphereLight(0xe6ece9, 0x2a3733, 1.0));
    const key = new THREE.DirectionalLight(0xfff8f0, 2.0); key.position.set(0.35, -0.55, 1); scene.add(key);
    const fill = new THREE.DirectionalLight(0xeaf1ff, 0.75); fill.position.set(-0.85, 0.25, 0.55); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.28); rim.position.set(0.1, 0.8, -1); scene.add(rim);
    this.headlight = new THREE.DirectionalLight(0xfffaf2, 0.7); scene.add(this.headlight);

    this.rig = new THREE.Group(); scene.add(this.rig);

    // interaction
    let dragging = null, lx = 0, ly = 0;
    const onDown = e => { dragging = e.button === 2 || e.shiftKey ? 'pan' : 'orbit'; lx = e.clientX; ly = e.clientY; this.canvas.setPointerCapture(e.pointerId); };
    const onMove = e => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
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
    const onUp = e => { dragging = null; try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) { } };
    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this._sph.radius = Math.max(14, Math.min(220, this._sph.radius * (1 + Math.sign(e.deltaY) * 0.08)));
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

    const scanMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.0 });
    const prepMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.02 });

    this.arch = new THREE.Mesh(buildGeometry(prep, prepRest), scanMat);
    this.prepTooth = new THREE.Mesh(buildGeometry(prep, prepSeg), prepMat);
    this.rig.add(this.arch, this.prepTooth);

    // proposed restoration = pre-op anatomy of the same tooth (doctor pref: replicate pre-op)
    const restMat = new THREE.MeshPhysicalMaterial({
      color: 0xe4d6bb, roughness: 0.30, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.28,
      sheen: 0.55, sheenColor: new THREE.Color(0xfff4e2), transparent: true, opacity: 0.97,
    });
    this.restoration = new THREE.Mesh(buildGeometry(preop, preopSeg), restMat);
    this.rig.add(this.restoration);

    // reference cage: the prep stump sitting inside the crown
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xc7e738, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false });
    this.preopGhost = new THREE.Mesh(buildGeometry(prep, prepSeg), ghostMat);
    this.preopGhost.renderOrder = 8;
    this.rig.add(this.preopGhost);

    // full pre-op arch, as its own toggleable scan
    this.preopArch = new THREE.Mesh(buildGeometry(preop, preop.index), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.58, metalness: 0, transparent: true, opacity: 0.9,
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
    const marginGeo = boundaryLoop(prep, prepSeg);
    this.margin = new THREE.Group();
    this.margin.add(new THREE.LineSegments(marginGeo,
      new THREE.LineBasicMaterial({ color: 0x1ac065, depthTest: false, transparent: true, opacity: 0.9 })));
    this.margin.add(new THREE.Points(marginGeo,
      new THREE.PointsMaterial({ color: 0x2fe07d, size: 2.4, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.95 })));
    this.margin.renderOrder = 20;
    this.rig.add(this.margin);

    // insertion axis through the prep centroid
    this.center = segCentroid(prep, unn);
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
    this._applyAttrs();
    this._dirty = true;
    this.dispatchEvent(new CustomEvent('scan-ready', { bubbles: true, composed: true }));
  }

  async _ensureOpposing() {
    if (this.opposing || this._loadingLower) return;
    this._loadingLower = true;
    const ply = await loadPLY(this.scanUrls.lower);
    this.opposing = new THREE.Mesh(buildGeometry(ply, ply.index),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, opacity: 0.62 }));
    this.rig.add(this.opposing);
    this._applyAttrs();
    this._dirty = true;
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

    this._applyTemplate();
    this._applyScanStyle();

    const view = this.getAttribute('view');
    if (view && VIEWS[view] && view !== this._lastView) {
      this._lastView = view;
      const cfg = VIEWS[view];
      const d = new THREE.Vector3(...cfg.d).normalize();
      this._sph.theta = Math.atan2(d.x, d.z);
      this._sph.phi = Math.acos(Math.max(-1, Math.min(1, d.y)));
      this._sph.radius = cfg.r;
      this._target.copy(cfg.t === 'arch' ? this.archCenter : this.center);
    }
  }

  _applyTemplate() {
    if (!this.restoration || !this.center) return;
    const TPL = {
      'central-a': [1.00, 1.00, 1.00],
      'central-b': [1.11, 0.96, 1.02],
      'central-c': [0.89, 1.04, 0.99],
      'central-d': [1.02, 0.86, 0.98],
      'central-e': [0.98, 1.09, 1.03],
      'central-f': [1.05, 0.99, 0.90],
    };
    const s = TPL[this.getAttribute('crowntpl')] || TPL['central-a'];
    const c = this.center;
    this.restoration.scale.set(s[0] * 1.004, s[1] * 1.004, s[2] * 1.004);
    this.restoration.position.set(c.x - c.x * s[0], c.y - c.y * s[1], c.z - c.z * s[2]);
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
      this.camera.position.lerp(p, 0.18);
      this.camera.lookAt(this._target);
      this.headlight.position.copy(this.camera.position);
      this.renderer.render(this.scene, this.camera);
      this._project();
    };
    tick();
  }

  _project() {
    if (!this.center) return;
    const v = this.center.clone().project(this.camera);
    const w = this.clientWidth, h = this.clientHeight;
    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    if (Math.abs(x - (this._ax || 0)) > 0.6 || Math.abs(y - (this._ay || 0)) > 0.6) {
      this._ax = x; this._ay = y;
      this.style.setProperty('--anchor-x', x.toFixed(1) + 'px');
      this.style.setProperty('--anchor-y', y.toFixed(1) + 'px');
    }
  }

  setView(name) { this.setAttribute('view', name); }
}

customElements.define('scan-viewer', ScanViewer);
