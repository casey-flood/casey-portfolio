// Real words from coworkers only; first names only. The section on /work/dandy shows once this has entries.
export interface Testimonial {
	quote: string; // exact words; "…" marks anything left out; [brackets] replace an @mention
	name: string;
	role: string;
	context?: string;
}

export const testimonials: Testimonial[] = [
	{
		quote:
			'Casey has shown a strong inclination toward operational excellence, driving multiple foundational initiatives beyond her day-to-day work. She drafted a Figma file SOP, initiated a design file cleanup, and explored automation through AI tooling to reduce repetitive work. She’s thinking ahead about scalable systems … These contributions demonstrate both a bias for action and strategic thinking.',
		name: 'Lizzie',
		role: 'Dandy design team',
		context: 'Performance review',
	},
	{
		quote:
			'Casey is an awesome design partner. She is thoughtful, ambitious, and goes out of her way to figure out what’s needed to solve the problem. … I saw her create an entire design system using Cursor that she basically taught herself. She was an inspiration to the design team.',
		name: 'Liz',
		role: 'Senior Product Designer, Dandy',
		context: 'LinkedIn recommendation',
	},
	{
		quote: 'You’re doing great work, of course we should be talking about it. … Thank you for making us better.',
		name: 'Tom',
		role: 'VP, Operations, Dandy',
	},
	{
		quote:
			'Making the left side banner wider was a great move, it not only looks really good now, it increases the functionality of the sliders. One of the issues with the old DDE sliders was that they were too short and therefore super sensitive. I think the new ones are fantastic! Both in how they look and how they work.',
		name: 'Tom',
		role: 'CAD team, Dandy',
		context: 'On the wider sliders',
	},
	{
		quote: 'Thank you to [Casey] for letting the good people know how gnarly DDE is and your streamlined vision to fix it.',
		name: 'Lizzie',
		role: 'Dandy design team',
		context: 'After an in-person design session',
	},
	{
		quote:
			'Kudos to [Casey] for bringing a depth of knowledge and vision for the DDE space. Very impressed with you and am glad we have you on that complex project, you’ve been integral to the designer experience for that team!!',
		name: 'Liz',
		role: 'Senior Product Designer, Dandy',
	},
];
