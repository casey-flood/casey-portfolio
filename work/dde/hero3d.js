// Scroll-driven 3D cover: a real scan, an auto-trim highlight, a crown that is generated, transformed and sculpted,
// and two flags. Progress (0..1) is passed in; nothing here touches the page layout.
import * as THREE from '/vendor/three.module.min.js';

const BASE = '/work/dde/hero3d/';

async function loadBin(name) {
	const buf = await (await fetch(BASE + name)).arrayBuffer();
	const dv = new DataView(buf);
	const nv = dv.getUint32(0, true), nf = dv.getUint32(4, true);
	const mn = [8, 12, 16].map((o) => dv.getFloat32(o, true));
	const rg = [20, 24, 28].map((o) => dv.getFloat32(o, true));
	const hasColor = dv.getUint8(32), wide = dv.getUint8(33);
	let o = 36;
	const q = new Int16Array(buf, o, nv * 3); o += nv * 6;
	const pos = new Float32Array(nv * 3);
	for (let i = 0; i < nv * 3; i++) pos[i] = ((q[i] + 32768) / 65535) * rg[i % 3] + mn[i % 3];
	let col = null;
	if (hasColor) {
		const c8 = new Uint8Array(buf, o, nv * 3); o += nv * 3;
		col = new Float32Array(nv * 3);
		for (let i = 0; i < nv * 3; i++) col[i] = Math.pow(c8[i] / 255, 2.2);
	}
	if (o % 4) o += 4 - (o % 4);
	const idx = wide ? new Uint32Array(buf, o, nf * 3) : new Uint16Array(buf, o, nf * 3);
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.setIndex(new THREE.BufferAttribute(idx, 1));
	g.computeVertexNormals();
	return g;
}

const ease = (t) => t * t * (3 - 2 * t);
const seg = (p, a, b) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));

export async function mountHero(stage, getProgress) {
	const canvas = stage.querySelector('canvas');
	const flags = Array.from(stage.querySelectorAll('[data-flag]'));
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
	renderer.setClearColor(0x000000, 0);
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(26, 1, 1, 400);

	scene.add(new THREE.HemisphereLight(0xffffff, 0x2a4a40, 1.25));
	const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(30, 40, 60); scene.add(key);
	const rim = new THREE.DirectionalLight(0x5af0b4, 1.4); rim.position.set(-50, 20, -30); scene.add(rim);

	const [scanG, trimG, crownG] = await Promise.all([loadBin('scan.bin'), loadBin('trim.bin'), loadBin('crown.bin')]);

	const scan = new THREE.Mesh(scanG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 }));
	const trim = new THREE.Mesh(trimG, new THREE.MeshBasicMaterial({ color: 0xb98cff, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
	const crownMat = new THREE.MeshStandardMaterial({ color: 0xf1eadc, roughness: 0.38, metalness: 0, transparent: true, opacity: 0 });
	const crown = new THREE.Mesh(crownG, crownMat);

	scanG.computeBoundingBox(); crownG.computeBoundingBox();
	const sb = scanG.boundingBox; const pivot = new THREE.Vector3(); sb.getCenter(pivot);
	const cc = new THREE.Vector3(); crownG.boundingBox.getCenter(cc);
	const rig = new THREE.Group(); rig.add(scan, trim, crown); rig.position.copy(pivot).multiplyScalar(-1);
	const spin = new THREE.Group(); spin.add(rig); spin.position.y = -3; scene.add(spin);

	// crown transforms about its own centre
	crownG.translate(-cc.x, -cc.y, -cc.z); crown.position.copy(cc);
	const orig = crownG.attributes.position.array.slice();
	const nrm = crownG.attributes.normal.array.slice();
	const pa = crownG.attributes.position;
	const sculpt = (p) => {
		const k = seg(p, 0.6, 0.8);
		const t = (p - 0.6) / 0.2;
		const cx = Math.sin(t * Math.PI * 1.5) * 2.2, cz = Math.cos(t * Math.PI * 1.2) * 1.6;
		const amp = 0.55 * Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * (k > 0 ? 1 : 0);
		const arr = pa.array;
		for (let i = 0; i < arr.length; i += 3) {
			const dx = orig[i] - cx, dz = orig[i + 2] - cz;
			const w = amp * Math.exp(-(dx * dx + dz * dz) / 3.2);
			arr[i] = orig[i] + nrm[i] * w; arr[i + 1] = orig[i + 1] + nrm[i + 1] * w; arr[i + 2] = orig[i + 2] + nrm[i + 2] * w;
		}
		pa.needsUpdate = true;
		crownG.computeVertexNormals();
	};

	// flag anchors, in rig space
	const anchors = [new THREE.Vector3().copy(cc).add(new THREE.Vector3(2, 6, 3)), new THREE.Vector3().copy(cc).add(new THREE.Vector3(1, 1, 5))];
	trimG.computeBoundingBox(); const tc = new THREE.Vector3(); trimG.boundingBox.getCenter(tc);
	anchors[0].set(tc.x, trimG.boundingBox.max.y, tc.z + 6);

	let W = 0, H = 0;
	const resize = () => {
		const r = stage.getBoundingClientRect();
		if (r.width === W && r.height === H && window.__fit === camera.userData.fit) return;
		camera.userData.fit = window.__fit;
		W = r.width; H = r.height;
		renderer.setSize(W, H, false);
		camera.aspect = W / H; camera.updateProjectionMatrix();
		const fit = (window.__fit ?? 70) / 0.88; // mm of arch to fit across the stage
		const d = Math.max(fit / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect), 70);
		camera.userData.d = d;
	};

	const v = new THREE.Vector3();
	const draw = (p) => {
		resize();
		const zk = seg(p, 0.24, 0.5);
		const d = camera.userData.d * (1 - (window.__zf ?? 0.22) * zk);
		const sk = zk * (window.__sk ?? 0.25);
		rig.position.set(-(pivot.x + (cc.x - pivot.x) * sk), -(pivot.y + (cc.y - pivot.y) * sk), -(pivot.z + (cc.z - pivot.z) * sk));
		const el = -0.1;
		camera.position.set(0, Math.sin(el) * d, Math.cos(el) * d);
		camera.lookAt(0, 0, 0);
		spin.rotation.y = (window.__a0 ?? 0.34) + ((window.__a1 ?? -0.75) - (window.__a0 ?? 0.34)) * p;
		spin.updateMatrixWorld(true);

		trim.material.opacity = 0.6 * seg(p, 0.04, 0.16) * (1 - seg(p, 0.36, 0.46));
		const born = seg(p, 0.3, 0.46);
		crown.visible = born > 0.001;
		crownMat.opacity = born;
		const grow = 0.6 + 0.4 * born;
		const stretch = 1 + 0.14 * seg(p, 0.5, 0.64);
		crown.scale.set(grow * stretch, grow, grow);
		crown.position.set(cc.x + 0.5 * seg(p, 0.5, 0.64), cc.y + (1 - born) * 3, cc.z);
		if (p > 0.58 && p < 0.84) sculpt(p); else if (p >= 0.84 || p <= 0.58) { if (stage._sculpted !== (p >= 0.84)) { sculpt(p >= 0.84 ? 0.8 : 0.6); stage._sculpted = p >= 0.84; } }
		renderer.render(scene, camera);
		stage.classList.toggle('h3d--moved', p > 0.03);

		// flags
		const vis = [seg(p, 0.1, 0.18) * (1 - seg(p, 0.36, 0.42)), seg(p, 0.8, 0.88)];
		flags.forEach((f, i) => {
			const a = anchors[i];
			v.copy(a).add(rig.position).applyMatrix4(spin.matrixWorld).project(camera);
			const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
			const fw = f.offsetWidth || 260;
			const fh = f.offsetHeight || 90;
			const left = Math.min(W - fw - 8, Math.max(8, x - fw * 0.35));
			const top = Math.max(8, y - fh - 70);
			f.style.transform = `translate(${left}px, ${top}px)`;
			f.style.opacity = String(vis[i]);
			f.style.setProperty('--ax', `${x - left}px`);
			f.style.setProperty('--ay', `${y - top}px`);
			f.classList.toggle('on', vis[i] > 0.05);
		});
	};

	let cur = getProgress(), target = cur, raf = 0;
	const loop = () => {
		raf = 0;
		target = getProgress();
		cur += (target - cur) * 0.16;
		if (Math.abs(target - cur) < 0.0006) cur = target;
		draw(cur);
		if (cur !== target) raf = requestAnimationFrame(loop);
	};
	const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
	addEventListener('scroll', kick, { passive: true });
	addEventListener('resize', kick);
	draw(cur);
	// How many opaque pixels touch each canvas edge at progress p (0 means nothing is cut off).
	const probe = (p) => {
		draw(p);
		const gl = renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
		const px = new Uint8Array(4 * Math.max(w, h));
		const count = (x, y, cw, ch) => { gl.readPixels(x, y, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0; for (let i = 3; i < 4 * cw * ch; i += 4) if (px[i] > 20) n++; return n; };
		return { left: count(0, 0, 1, h), right: count(w - 1, 0, 1, h), top: count(0, h - 1, w, 1), bottom: count(0, 0, w, 1) };
	};
	return { draw, kick, probe, setProgress: (p) => { cur = target = p; draw(p); } };
}
