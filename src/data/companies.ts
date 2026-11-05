// Company banners on /work. To add a visual, drop the file in /public/work/ and set `src`.
// Videos/GIFs: use kind 'video' (muted, looping) or a .gif/.webp with kind 'image'.

export interface Visual {
	src?: string;
	kind?: 'image' | 'video';
	poster?: string;
	alt: string;
	label: string; // placeholder title
	hint: string; // what to put here
	pos?: string; // object-position
}

export interface Tile {
	title: string;
	href?: string;
	metric?: { value: string; label: string };
	note?: string; // short line when there is no metric
	visual: Visual;
	tag?: { label: string; kind: 'dentist' | 'designer' | 'systems' }; // compact teaser style when set
}

export interface Company {
	id: string;
	name: string;
	logo?: string; // optional SVG path in /public/work/
	theme: 'dark' | 'blue' | 'paper';
	simple?: boolean; // big image + text only, projects listed as one quiet line
	flip?: boolean; // image on the left
	role: string;
	when: string;
	blurb: string;
	cta?: { label: string; href: string };
	visual: Visual;
	tiles: Tile[];
}

export const companies: Company[] = [
	{
		id: 'dandy',
		name: 'Dandy',
		theme: 'dark',
		simple: true,
		logo: '/brand/dandy-wordmark.svg',
		role: 'Senior Product Designer',
		when: 'Mar 2025 – now',
		blurb:
			'Designing both sides of a digital dental lab.',
		cta: { label: 'Overview and all projects', href: '/work/dandy' },
		visual: {
			src: '/work/dandy-vision.webp',
			alt: 'Dandy Vision confirming a scan is lab-ready',
			label: 'Dandy',
			hint: 'Hero image for Dandy',
			pos: 'center',
		},
		tiles: [
			{ title: 'Dandy Design Editor', href: '/work/dandy-design-editor', tag: { label: 'Designer experience', kind: 'designer' }, note: 'Sole product designer · in progress', visual: { alt: '', label: '', hint: '' } },
			{ title: 'Instant Design Preview', tag: { label: 'Dentist experience', kind: 'dentist' }, note: 'Chairside · coming soon', visual: { alt: '', label: '', hint: '' } },
			{ title: 'Goldilocks', tag: { label: 'Dentist experience', kind: 'dentist' }, note: 'Three fits, one right crown · coming soon', visual: { alt: '', label: '', hint: '' } },
			{ title: 'Design Editor design system', href: '/work/dandy-design-system', tag: { label: 'Systems design', kind: 'systems' }, metric: { value: '5–10 min', label: 'iteration, down from 30–45' }, visual: { alt: '', label: '', hint: '' } },
			{ title: 'Clickable prototypes', href: '/work/dandy-prototype', tag: { label: 'Systems design', kind: 'systems' }, note: 'Real components, full flows', visual: { alt: '', label: '', hint: '' } },
			{ title: 'Product Design Hub', href: '/work/dandy-product-design-hub', tag: { label: 'Systems design', kind: 'systems' }, note: 'Design-in-code, taught', visual: { alt: '', label: '', hint: '' } },
		],
	},
	{
		id: 'amwell',
		name: 'Amwell',
		theme: 'blue',
		flip: true,
		role: 'UX Designer to Senior Product Designer',
		when: '2019 – 2024',
		blurb:
			'Virtual urgent care, used by millions.',
		cta: { label: 'Overview and all projects', href: '/work/amwell' },
		visual: {
			src: '/amwell/wireframes.jpg',
			alt: 'Amwell admin portal wireframes',
			label: 'Amwell',
			hint: 'Hero image for Amwell',
		},
		tiles: [
			{
				title: 'Admin portal redesign',
				href: '/work/amwell-admin-portal',
				metric: { value: '45% → 82%', label: 'task completion' },
				visual: { src: '/amwell/wireframes.jpg', alt: 'Admin portal wireframes', label: 'Admin portal', hint: 'Screenshot' },
			},
			{
				title: 'AI While You Wait',
				metric: { value: 'ML-assisted', label: 'pre-visit triage' },
				visual: { alt: 'The AI While You Wait triage flow', label: 'Triage flow', hint: 'Screen or GIF' },
			},
			{
				title: 'Patient onboarding',
				metric: { value: '+18%', label: 'engagement' },
				visual: { alt: 'The patient onboarding flow', label: 'Onboarding', hint: 'Screen or GIF' },
			},
		],
	},
	{
		id: 'earlier',
		name: 'Earlier and independent',
		theme: 'paper',
		role: 'Product designer',
		when: '2017 – now',
		blurb: 'A first startup, design school, and freelance work.',
		cta: { label: 'Overview and all projects', href: '/work/earlier' },
		visual: {
			src: '/paper-airplane/mvp.webp',
			alt: 'Paper Airplane MVP screens',
			label: 'Earlier work',
			hint: 'Collage of My Trips, Paper Airplane, and client work',
		},
		tiles: [
			{
				title: 'My Trips',
				href: '/work/mytrips',
				metric: { value: '94%', label: 'less time to share a trip' },
				visual: { alt: 'The My Trips itinerary app', label: 'My Trips', hint: 'Screen or GIF' },
			},
			{
				title: 'Paper Airplane',
				href: '/work/paper-airplane',
				metric: { value: '13', label: 'tested screens' },
				visual: { src: '/paper-airplane/screen-01.webp', alt: 'A Paper Airplane app screen', label: 'Paper Airplane', hint: 'Screen' },
			},
		],
	},
];
