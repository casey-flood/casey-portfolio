// Takeover stack: each listed section pins on its last frame, and the next one is pinned too,
// fading in right where the last one fades out, so content is replaced in place (no wipe, no cut-off).
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** A section's natural (in-flow) top, unaffected by sticky or the handoff transform. */
export function natTop(el: HTMLElement): number {
	const s = el.previousElementSibling as HTMLElement | null;
	if (s && s.classList.contains('dv-sent')) return s.getBoundingClientRect().top + (parseFloat(el.style.marginTop) || 0);
	return el.getBoundingClientRect().top;
}

export function stackSections(root: HTMLElement, els: HTMLElement[]) {
	if (matchMedia('(max-width: 899px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const v = getComputedStyle(root).getPropertyValue('--hv-top').trim();
	const hvTop = (parseFloat(v) * (v.endsWith('rem') ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1)) || 72;
	const sent = els.map((s) => {
		const d = document.createElement('div');
		d.className = 'dv-sent';
		d.style.cssText = 'height:0;margin:0;padding:0;pointer-events:none';
		s.before(d);
		return d;
	});
	const HAND = 0.5; // the handoff takes half a screen of scrolling; the next section starts that far up
	const place = (s: HTMLElement) => {
		s.style.top = `${Math.min(hvTop, innerHeight - s.offsetHeight)}px`;
		s.style.minHeight = `${innerHeight - hvTop}px`;
		s.style.marginTop = els.indexOf(s) > 0 ? `${-HAND * (innerHeight - hvTop)}px` : '';
	};
	const update = () => {
		const avail = Math.max(1, (innerHeight - hvTop) * HAND);
		const delta = els.map((s) => natTop(s) - hvTop);
		els.forEach((s, i) => {
			let o = 1, ty = 0;
			if (i > 0) {
				const p = 1 - clamp01(delta[i] / avail); // 0 below the screen, 1 once it owns the screen
				o = clamp01((p - 0.5) / 0.4);
				if (delta[i] > 0 && delta[i] <= avail) ty = -delta[i]; // hold it in place instead of sliding up
			}
			if (i < els.length - 1) {
				const q = 1 - clamp01(delta[i + 1] / avail);
				o *= clamp01(1 - q / 0.45);
			}
			s.style.opacity = String(o);
			s.style.transform = ty ? `translateY(${ty}px)` : '';
			s.style.pointerEvents = o < 0.05 ? 'none' : '';
			s.style.visibility = o <= 0 ? 'hidden' : '';
		});
	};
	let raf = 0;
	const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
	els.forEach((s) => {
		s.classList.add('dv-take');
		place(s);
		new ResizeObserver(() => { place(s); sched(); }).observe(s);
	});
	addEventListener('resize', () => { els.forEach(place); sched(); });
	addEventListener('load', () => { els.forEach(place); sched(); });
	addEventListener('scroll', sched, { passive: true });
	update();
}

/** Gives each rail dot a short label ("03 · Field research") that shows next to the active dot. */
export function railLabels(items: HTMLElement[], rail: HTMLElement[]) {
	rail.forEach((r, k) => {
		const name = items[k]?.querySelector('a')?.textContent?.trim() ?? '';
		r.dataset.label = k === 0 ? name : `${String(k).padStart(2, '0')} · ${name}`;
	});
}

/** Makes the little progress bars under each scene clickable: jump straight to that step. */
export function wireDots(root: HTMLElement) {
	root.querySelectorAll<HTMLAnchorElement>('a[data-goid]').forEach((a) => a.addEventListener('click', (e) => {
		const el = document.getElementById(a.dataset.goid!);
		if (!el) return;
		e.preventDefault();
		scrollTo({ top: natTop(el) + scrollY - 70, behavior: 'smooth' });
	}));
	root.querySelectorAll<HTMLElement>('.sc, .hv__praise').forEach((sec) => {
		const lis = Array.from(sec.querySelectorAll<HTMLElement>('.sc__dots li, .hv__praise-dots li'));
		lis.forEach((li, i) => {
			li.parentElement?.removeAttribute('aria-hidden');
			li.classList.add('dv-dotbtn');
			li.setAttribute('role', 'button');
			li.tabIndex = 0;
			li.setAttribute('aria-label', `Go to step ${i + 1} of ${lis.length}`);
			const go = () => {
				const top = natTop(sec) + scrollY;
				scrollTo({ top: top + ((i + 0.5) / lis.length) * (sec.offsetHeight - innerHeight), behavior: 'smooth' });
			};
			li.addEventListener('click', go);
			li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
		});
	});
}


/** Hovering a navigator item shows a small preview of that section beside the panel. */
export function tocPreview(toc: HTMLElement) {
	if (matchMedia('(hover: none)').matches) return;
	const panel = toc.querySelector<HTMLElement>('.toc__panel');
	const items = Array.from(toc.querySelectorAll<HTMLElement>('.toc__item[data-prev]'));
	if (!panel || !items.length) return;
	const card = document.createElement('div');
	card.className = 'toc__prev';
	card.setAttribute('aria-hidden', 'true');
	const img = document.createElement('img');
	img.alt = '';
	const cap = document.createElement('p');
	card.append(img, cap);
	document.body.appendChild(card);
	let warmed = false;
	const warm = () => { if (warmed) return; warmed = true; items.forEach((it) => { const i = new Image(); i.src = it.dataset.prev!; }); };
	const hide = () => card.classList.remove('on');
	const show = (it: HTMLElement) => {
		warm();
		const r = it.getBoundingClientRect();
		const pr = panel.getBoundingClientRect();
		const h = card.offsetHeight || 190;
		img.onerror = hide;
		img.src = it.dataset.prev!;
		cap.textContent = it.querySelector('a')?.textContent?.trim() ?? '';
		card.style.left = `${pr.right + 10}px`;
		card.style.top = `${Math.max(76, Math.min(innerHeight - h - 12, r.top + r.height / 2 - h / 2))}px`;
		card.classList.add('on');
	};
	items.forEach((it) => {
		it.addEventListener('mouseenter', () => show(it));
		it.addEventListener('focusin', () => show(it));
	});
	toc.addEventListener('mouseleave', hide);
	toc.addEventListener('focusout', hide);
}
