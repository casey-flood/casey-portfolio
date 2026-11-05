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

export interface Stage {
	n: number;
	id: string;
	title: string;
	actor: ActorId;
	actorLabel?: string; // overrides the actor label on the card
	what: string; // plain-language description
	software: string | null;
	travels: string; // what moves on to the next step
	handoff: string; // who hands off to whom, and how
	mode: 'human' | 'digital' | 'physical'; // how the case reaches the NEXT step
	intervened?: string; // where Casey's design work sits
	validate?: string; // anything on this stage that still needs confirming
}

export const stages: Stage[] = [
	{
		n: 1,
		id: 'need',
		title: 'Damaged tooth',
		actor: 'patient',
		what: 'A patient needs a restoration, such as a crown. A dentist recommends one.',
		software: null,
		travels: 'The need',
		handoff: 'Patient to dentist, in the chair',
		mode: 'human',
	},
	{
		n: 2,
		id: 'scan',
		title: 'Dentist scans',
		actor: 'dentist',
		what: "The dentist captures a 3D digital model of the patient's mouth with an intraoral scanner, in Dandy's Chairside software. Dandy Vision is Dandy's scanner, and Chairside also works with others like iTero and Trios.",
		software: 'Chairside, with Dandy Vision or a compatible scanner',
		travels: '3D scan',
		handoff: 'Same dentist, same software',
		mode: 'digital',
	},
	{
		n: 3,
		id: 'order',
		title: 'Dentist orders',
		actor: 'dentist',
		what: 'In Chairside, the dentist chooses the product, the material, and preferences like fit, aesthetics, and shipping time. The scans attach to the order.',
		software: 'Chairside order flow',
		travels: 'Scan, order, preferences',
		handoff: 'Dentist to designer, digitally',
		mode: 'digital',
		intervened: 'Goldilocks and IDP',
	},
	{
		n: 4,
		id: 'design',
		title: 'Designer designs',
		actor: 'designer',
		what: "A dental designer, a lab technician, receives the order and designs the restoration in 3D. They now use Dandy's own software, DDE, which replaced third-party tools like Exocad and 3Shape. Some workflows let the dentist preview or approve the design first.",
		software: 'DDE (Dandy Design Editor)',
		travels: 'Finished design',
		handoff: 'Designer to manufacturing, digitally',
		mode: 'digital',
		intervened: 'DDE',
	},
	{
		n: 5,
		id: 'make',
		title: 'Crown is made',
		actor: 'ops',
		what: "The design becomes a physical restoration. Methods vary by restoration type and material, and milling is one of them. Dandy has built an automated warehouse that handles much of this work, which used to be manual.",
		software: 'Manufacturing and fulfillment operations',
		travels: 'Physical crown, shipped',
		handoff: 'Manufacturing to dentist, shipped',
		mode: 'physical',
		validate: 'Specific systems and methods per product',
	},
	{
		n: 6,
		id: 'place',
		title: 'Crown is placed',
		actor: 'dentist',
		actorLabel: 'Dentist and patient',
		what: 'The restoration arrives at the dental practice. At the patient’s appointment, the dentist checks the fit and places it in their mouth.',
		software: null,
		travels: 'A finished restoration',
		handoff: 'Dentist to patient, in the chair',
		mode: 'human',
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
