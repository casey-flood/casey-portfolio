// Single source of truth for the "From Scan to Smile" journey.
// Everything here comes from "Lifecycle of a case.pdf" or from Casey directly.
// Anything marked `validate: true` still needs confirmation before it is treated as fact.

export type ActorId = 'patient' | 'dentist' | 'designer' | 'ops';
export type ProjectId = 'dde' | 'idp' | 'gold';

export const actors: Record<ActorId, { label: string; color: string }> = {
	patient: { label: 'Patient', color: '#8a8a94' },
	dentist: { label: 'Dentist', color: '#2b59ff' },
	designer: { label: 'Dental designer', color: '#7a5cff' },
	ops: { label: 'Manufacturing and ops', color: '#14906b' },
};

export type GroupId = 'patient' | 'dentist' | 'designer' | 'ops' | 'both';

// The colored containers in the journey. Steps are grouped by who experiences them.
export const groups: Record<GroupId, { label: string }> = {
	patient: { label: 'Patient experience' },
	dentist: { label: 'Dentist experience' },
	designer: { label: 'Lab tech (designer) experience' },
	ops: { label: 'Manufacturing and ops' },
	both: { label: 'Dentist and patient experience' },
};

export interface Stage {
	n: number;
	id: string;
	title: string;
	group: GroupId;
	actor: ActorId;
	actorLabel?: string;
	// Detail shown under the selected card. Links use [[label|url]]; internal paths start with /.
	teaser?: string; // one line shown on hover; the full text opens on click
	paras?: string[];
	bullets?: string[];
	software: string | null;
	travels: string;
	handoff: string;
	intervened?: string;
	validate?: string; // anything still to confirm; shown to the reader as "To validate"
}

export const stages: Stage[] = [
	{
		n: 1,
		id: 'need',
		teaser: 'A patient needs a restoration, like a crown or bridge.',
		title: 'Damaged tooth',
		group: 'patient',
		actor: 'patient',
		paras: [
			'A patient comes to their dentist needing a restoration: a crown, bridge, inlay, onlay, denture, implant, or similar.',
			'A crown is the example here because crown and bridge make up about 80% of the cases at Dandy, and I\u2019m the sole product designer for that product line. The journey is much the same for Dandy\u2019s other products.',
		],
		software: null,
		travels: 'The need',
		handoff: 'Patient to dentist, in the chair',
	},
	{
		n: 2,
		id: 'scan',
		teaser: 'A 3D scan of the mouth replaces the physical mold.',
		title: 'Dentist scans',
		group: 'dentist',
		actor: 'dentist',
		paras: [
			'The dentist captures a 3D scan of the patient\u2019s mouth with the [[Dandy Vision scanner|https://www.meetdandy.com/technology/intraoral-scanner/]], proprietary hardware that Dandy manufactures. Third-party scanners work too, including [[Trios|https://www.3shape.com]] and [[iTero|https://www.itero.com]].',
			'A 3D scan is a precise digital model of the teeth and gums. Instead of a physical mold, it can be checked on screen and sent instantly with the order.',
		],
		software: 'Chairside, with Dandy Vision or a compatible scanner',
		travels: '3D scan',
		handoff: 'Same dentist, same software',
	},
	{
		n: 3,
		id: 'order',
		teaser: 'The dentist picks the product, material, and preferences.',
		title: 'Dentist orders',
		group: 'dentist',
		actor: 'dentist',
		bullets: [
			'The scans are uploaded to the case.',
			'The dentist moves through Chairside, Dandy\u2019s ordering software.',
			'They choose the product, the material, and preferences like fit, aesthetics, and shipping time.',
		],
		software: 'Chairside order flow',
		travels: 'Scan, order, preferences',
		handoff: 'Dentist to designer, digitally',
		intervened: 'Goldilocks and IDP',
	},
	{
		n: 4,
		id: 'design',
		teaser: 'A dental designer builds the restoration in 3D.',
		title: 'Designer designs',
		group: 'designer',
		actor: 'designer',
		paras: [
			'A dental designer, a lab technician, receives the order and designs the restoration in 3D using CAD software.',
			'Designers used to work in third-party tools like [[exocad|https://exocad.com]] or [[3Shape|https://www.3shape.com]]. Dandy has since built its own software in-house, the Dandy Design Editor (DDE).',
			'In some workflows, the dentist can preview and approve the design before it\u2019s manufactured.',
		],
		software: 'DDE (Dandy Design Editor)',
		travels: 'Finished design',
		handoff: 'Designer to manufacturing, digitally',
		intervened: 'DDE',
	},
	{
		n: 5,
		id: 'make',
		teaser: 'The approved design is manufactured, much of it automated.',
		title: 'Crown is made',
		group: 'ops',
		actor: 'ops',
		paras: [
			'The approved design is manufactured. This used to be a manual process. Dandy has since built out a warehouse that automates much of it, with machines like a stain machine. Methods vary by product and material.',
			'Read more about [[Dandy\u2019s labs|https://www.meetdandy.com/labs-gp/]] and [[crown and bridge manufacturing|https://www.meetdandy.com/labs/crown-and-bridge/]].',
		],
		software: 'Manufacturing and fulfillment operations',
		travels: 'Physical crown, shipped',
		handoff: 'Manufacturing to dentist, shipped',
		validate: 'Specific systems and methods per product',
	},
	{
		n: 6,
		id: 'place',
		teaser: 'The dentist checks the fit and places the crown.',
		title: 'Crown is placed',
		group: 'both',
		actor: 'dentist',
		actorLabel: 'Dentist and patient',
		paras: [
			'The restoration is shipped to the practice. At the patient\u2019s appointment, the dentist checks the fit and places it.',
			'If the crown isn\u2019t right, the dentist can send it back for a remake, called a refabrication, or refab. The goal is a crown that fits first time, with one or two appointments to seat it.',
			'This process used to be tedious and manual, run through local labs with little insight into, or control over, the whole thing. By automating and scaling it, Dandy owns the entire process, which means faster turnaround and better quality. Dandy reports up to 50% fewer remakes than the old workflow and first-fit accuracy above 98% ([[source|https://www.meetdandy.com/labs/crown-and-bridge/]]). See also [[how practices use Dandy|https://www.meetdandy.com/case-studies/]].',
		],
		software: null,
		travels: 'A finished restoration',
		handoff: 'Dentist to patient, in the chair',
		intervened: 'Goldilocks outcome',
	},
];

export interface Project {
	id: ProjectId;
	label: string;
	stages: number[]; // primary stages
	near?: number[]; // softly lit neighbours
	blurb: string; // one line for the compact strip and the hub
	validate?: string;
}

export const projects: Record<ProjectId, Project> = {
	dde: {
		id: 'dde',
		label: 'DDE',
		stages: [4],
		near: [3, 5],
		blurb: 'DDE is where the incoming case is prepared and the restoration is designed.',
	},
	idp: {
		id: 'idp',
		label: 'IDP',
		stages: [3, 4],
		blurb:
			'IDP sits in the dentist’s Chairside experience: they preview the generated crown, tweak it, and add notes before it goes to a designer or the lab.',
		validate: 'Exact placement relative to the order is still to confirm',
	},
	gold: {
		id: 'gold',
		label: 'Goldilocks',
		stages: [3, 6],
		blurb:
			'Goldilocks starts at the order, where dentists opt in to receive three versions of the same crown with different contact fits, and pays off at seating, when they pick the best one without a reorder.',
	},
};

export const intro =
	'A crown is the example. Dandy also makes bridges, inlays, onlays, dentures, implants, and more.';

export const optionalLoop = 'Optional: dentist previews and approves';
