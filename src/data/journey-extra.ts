import fs from 'node:fs';

export type Part = string | { t: string; href: string; title: string; desc: string; slug: string };
// Extra context for some journey steps, shown under the one-line description. Facts are from the lifecycle data.
export const preview = (slug: string) => ['webp', 'png', 'jpg'].map((e) => `/work/previews/${slug}.${e}`).find((f) => fs.existsSync(`./public${f}`)) ?? null;
export const extra: Record<number, { teaser?: string; more: Part[] }> = {
	2: {
		more: [
			'The scan can come from Dandy’s own ',
			{ t: 'Dandy Vision scanner', href: 'https://www.meetdandy.com/technology/intraoral-scanner/', title: 'Dandy Vision scanner', desc: 'Dandy’s intraoral scanner, hardware Dandy manufactures.', slug: 'dandy-vision' },
			', or from third-party scanners like ',
			{ t: '3Shape Trios', href: 'https://www.3shape.com', title: '3Shape Trios', desc: 'An intraoral scanner from 3Shape.', slug: 'trios' },
			' and ',
			{ t: 'iTero', href: 'https://www.itero.com', title: 'iTero', desc: 'An intraoral scanner from Align Technology.', slug: 'itero' },
			'.',
		],
	},
	5: {
		more: [
			'Zirconia is milled from a ceramic block, sintered in a furnace, then stained, glazed, and polished. Dandy automates much of it with robotics and, ',
			{ t: 'by its own account', href: 'https://www.meetdandy.com/labs/crown-and-bridge/', title: 'Dandy crown and bridge lab', desc: 'How Dandy makes crowns and bridges, in Dandy’s words.', slug: 'dandy-crown-bridge' },
			', checks each crown against the original scan with computer vision before it ships.',
		],
	},
	6: {
		more: [
			'This used to run through small local labs: physical molds shipped back and forth, with little visibility into the process. Dandy digitized and automated it at scale, for faster turnaround and more volume. Dandy reports ',
			{ t: 'up to 50% fewer remakes and first-fit accuracy above 98%', href: 'https://www.meetdandy.com/labs/crown-and-bridge/', title: 'Dandy crown and bridge lab', desc: 'Dandy’s published remake and first-fit figures.', slug: 'dandy-crown-bridge' },
			'.',
		],
	},
	4: {
		teaser: 'A dental designer (lab tech) receives the order from the dentist through the Dandy Ops portal and designs the restoration in 3D.',
		more: [],
	},
	3: {
		teaser: 'The dentist uses Chairside, Dandy’s ordering software, to view the scans, choose the product, the material, and preferences like fit, aesthetics, and shipping time.',
		more: [],
	},
};

// Small line icons for who the step belongs to.
export const icons: Record<string, string> = {
	patient: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/>',
	dentist: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/><path d="M16.5 3.5v4M14.5 5.5h4"/>',
	designer: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/><path d="M8.5 11.5c.6-2.2 2-3 3.5-3s2.900.8 3.500 3"/>',
	ops: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M18.400 5.600l-2.100 2.100M7.700 16.300l-2.100 2.100"/>',
	prep: '<path d="M14.500 5.500a4 4 0 0 0-5 5L4 16l4 4 5.500-5.500a4 4 0 0 0 5-5l-2.500 2.500-2.500-.5-.5-2.500z"/>',
	audit: '<circle cx="12" cy="12" r="8.500"/><path d="M8 12.500l2.800 2.800L16.500 9.500"/>',
	portal: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>',
	both: '<circle cx="8.500" cy="9" r="2.800"/><circle cx="16" cy="9.500" r="2.400"/><path d="M3 19c.5-3 2.500-4.800 5.500-4.800S13.500 16 14 19M14.500 15c2.600-.2 4.700 1.200 5.500 4"/>',
};
