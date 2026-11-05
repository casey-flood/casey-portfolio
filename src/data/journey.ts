// Casey's story. Edit text here.
//
// PHOTOS / GIFS / VIDEO: drop files into public/journey/ and set `media` on any
// scene below, for example:
//   media: { src: '/journey/paper-airplane.jpg', alt: 'Guerrilla marketing in Boston' }
//   media: { src: '/journey/demo.gif', alt: 'Design Editor demo' }          (GIFs work as images)
//   media: { src: '/journey/talk.mp4', alt: 'Talk at ...', kind: 'video' }
// Until `media` is set, a placeholder is shown.

export interface Media {
	src: string;
	alt: string;
	kind?: 'image' | 'video';
	poster?: string; // video only
	autoplay?: boolean; // video only: plays silently, loops, pauses when off-screen
}

export const paper = {
	year: '2017',
	kicker: 'Paper Airplane · Boston',
	title: 'I did anything and everything.',
	body: 'My first design job was at an early-stage dating app built around meeting up in real life. On a seven-person team, I shaped the interface, marketing strategy, guerrilla marketing, and brand visibility. UX was still in its infancy, so I learned by doing a little of everything.',
	hats: [
		{ name: 'Researcher', line: '41 survey responses, 4 interviews, 6 card sorts, and 4 usability tests.' },
		{ name: 'UI designer', line: '13 final screens in Figma, with no design system, built from UI kits.' },
		{ name: 'Product manager', line: 'User stories into a three-feature MVP, plus timelines and prioritization.' },
		{ name: 'Solutions architect', line: 'Planned around the Google Maps API, with a custom layer to count users at each venue.' },
		{ name: 'Marketer', line: 'Guerrilla marketing and brand visibility to get the app in front of people.' },
	],
	link: { href: '/work/paper-airplane', label: 'Read the case study' },
	lesson: 'Do whatever the product needs, even when it isn\'t in the job description.',
	hint: 'Guerrilla marketing, the team, or an early design',
	media: undefined as Media | undefined,
};

export const pratt = {
	year: '2018',
	kicker: 'Pratt Institute · UX & UI Mobile Design Certificate',
	title: 'I learned the craft.',
	body: 'Formal training turned instinct into method. I learned user research hands-on, with notecards on a studio floor and sketches on the wall, then applied it to a capstone.',
	lesson: 'Instinct gets you started. Method makes it repeatable.',
	// Scrapbook collage (transparent PNG). Replace the file to update it.
	scrapbook: { src: '/journey/pratt-scrapbook.png', alt: 'Scrapbook: hand-drawn My Trips user flows, a card-sorting exercise, classmates, and the Pratt Institute entrance' },
	// Tap a method to see what it is. `trip` = how it showed up in My Trips (only add what's true).
	methods: [
		{ name: 'Card sorting', what: 'People group labeled cards into categories that make sense to them, revealing the mental models behind navigation and naming.', trip: 'A card sort with twelve people showed how travelers group the actions of sharing a trip.' },
		{ name: 'Empathy mapping', what: 'A one-page map of what a user says, thinks, does, and feels, so the team builds around a person instead of a persona label.' },
		{ name: 'Mind mapping', what: 'Radiating a problem into branches to explore the space before narrowing it, useful at the very start of a project.' },
		{ name: 'User interviews', what: 'One-on-one conversations to understand goals, habits, and pain points in people\'s own words.', trip: 'Eight in-depth interviews with travelers surfaced where sharing a trip broke down.' },
		{ name: 'User flows', what: 'Mapping the steps someone takes to finish a task, from first tap to done, before any screen is designed.', trip: 'Hand-drawn flows (top of the collage) mapped taking, selecting, and sharing photos.' },
		{ name: 'Usability testing', what: 'Watching people try a prototype to find where they hesitate, misread, or drop off.', trip: 'Testing showed people dropped off when asked to review everything at once, which led to daily prompts.' },
	],
};

export const newyork = {
	year: '2018',
	kicker: 'New York City · Cooper Hewitt, Smithsonian Design Museum',
	title: 'New York made me obsessed with design.',
	body: 'Pratt was my first time living in New York, one of the biggest design communities in the world, and it was a great place to learn. The Cooper Hewitt quickly became my favorite museum. Exhibits like Connected by Design and Navigating Color are where I started to understand the psychology and empathy behind design, and how it connects people.',
	scrapbook: { src: '/journey/cooper-hewitt-scrapbook.png', alt: 'Scrapbook: Cooper Hewitt museum exhibits, the Connected by Design program, a color exhibit, and Pratt classmates' },
};

export const testing = {
	year: '2018',
	kicker: 'My Trips · Research in the field',
	title: 'I tested it with real people.',
	body: 'Card sorts on a studio floor showed me how people group the actions of sharing a trip. Then I put the prototype in their hands and watched where they hesitated. The biggest finding: people dropped off when asked to review everything at once, which led to daily review prompts.',
	steps: ['Card sorting', 'In-person usability testing'],
	media: {
		src: '/journey/usertesting.mp4',
		poster: '/journey/usertesting-poster.jpg',
		alt: 'Three clips: two card-sorting sessions on a studio floor and one person testing the My Trips prototype on a phone',
		kind: 'video',
		autoplay: true,
	} as Media,
};

export const mytrips = {
	year: '2018',
	kicker: 'Pratt capstone · My Trips',
	title: 'And I built something real from it.',
	body: 'My Trips is an itinerary creator for spontaneous travelers. Photos and location data become a timeline friends can actually use. Research led to a prototype, and testing shaped the final flow.',
	results: [
		{ v: '94%', l: 'less time to share a trip, in user testing' },
		{ v: '93%', l: 'adoption in user testing' },
	],
	hint: 'A screen recording or GIF of the My Trips prototype',
	// GIF/video of the prototype. Example: { src: '/journey/mytrips.gif', alt: 'My Trips prototype walkthrough' }
	media: undefined as Media | undefined,
	links: [
		{ href: '/work/mytrips', label: 'Read the case study' },
		{ href: 'https://mytrips-prototype-37ptf5c3o-caseylflood-gmailcoms-projects.vercel.app/', label: 'Open the live prototype', external: true },
	],
};

export const amwell = {
	year: '2019',
	kicker: 'Amwell · 2019 – 2024',
	title: 'I climbed from UX Designer to Senior Product Designer.',
	ranks: [
		{
			year: '2019',
			title: 'UX Designer',
			scope: 'Journeys',
			summary:
				'I owned UX and research for the patient experience on mobile and web: onboarding, enrollment, payment, and the waiting room.',
			results: [
				{ v: '86%', l: 'of user research led' },
				{ v: '#1', l: 'J.D. Power satisfaction ranking' },
				{ v: 'C-suite', l: 'findings presented to executives' },
			],
			hint: 'Early Amwell: team, office, or a research session',
			media: undefined as Media | undefined,
		},
		{
			year: '2021',
			title: 'Senior UX Designer',
			scope: 'Systems',
			summary:
				'I led UX strategy for patient experiences: accessibility, vendor-integrated journeys, the "AI While You Wait" triage flow, and information architecture standards reused across client configurations.',
			results: [
				{ v: '+20%', l: 'onboarding conversion' },
				{ v: '−25%', l: 'inbound inquiries' },
				{ v: '45%', l: 'lower perceived wait time' },
				{ v: '+34%', l: 'satisfaction' },
			],
			hint: 'Talks, workshops, or design sprints you led',
			media: undefined as Media | undefined,
		},
		{
			year: '2023',
			title: 'Senior Product Designer',
			scope: 'Teams',
			summary:
				'I owned design direction across patient, provider, and admin on web and white-label mobile. I mentored designers, standardized components, and redesigned the admin platform with a scalable multi-tier framework.',
			results: [
				{ v: '45% → 82%', l: 'admin task completion' },
				{ v: '+18%', l: 'bookings from streamlined intake' },
				{ v: '+12%', l: 'satisfaction' },
				{ v: '25%', l: 'less development time' },
			],
			hint: 'Your team, the Egypt trip, offsites, or a launch moment',
			media: undefined as Media | undefined,
		},
	],
	link: { href: '/work/amwell-admin-portal', label: 'Read the Amwell admin case study' },
};

export const freelance = {
	year: '2017 – now',
	kicker: 'caseyflood.design',
	title: 'And always a few side quests.',
	body: 'Alongside full-time roles, I\'ve taken on freelance projects across healthcare, finance, travel, construction, and digital media. It keeps me fast at learning new domains.',
	cards: [
		{ label: 'Healthcare', media: undefined as Media | undefined },
		{ label: 'Finance', media: undefined as Media | undefined },
		{ label: 'Travel', media: undefined as Media | undefined },
		{ label: 'Construction', media: undefined as Media | undefined },
		{ label: 'Digital media', media: undefined as Media | undefined },
	],
};

export const dandy = {
	year: '2025',
	kicker: 'Dandy · 2025 – now',
	title: 'Today, I design in the real material.',
	body: 'At Dandy I design operator-facing software for dental manufacturing. I started with dentist-facing ordering and chairside flows, then became the sole product designer on the Design Editor, where lab designers prep scans, design restorations, and check quality across fixed, removable, and implant workflows.',
	then: {
		label: 'Then · Amwell',
		note: 'Before AI was part of how we worked.',
		steps: [
			'Research and flows in Figma and Miro',
			'High-fidelity designs and prototypes in Figma',
			'Hand off to engineering through Jira tickets',
			'Review builds in bi-weekly QA checks',
		],
	},
	now: {
		label: 'Now · Dandy',
		note: 'Designing in the production codebase.',
		steps: [
			'Prototype in Storybook with real React components',
			'Iterate with Cursor and Claude',
			'Validate with internal users in real workflows',
			'Ship as production UI. The design system lives in Storybook.',
		],
	},
	outcome: 'Better tools, faster turnaround, fewer remakes, and a better fit for the people we serve.',
	hint: 'The Design Editor, a Storybook screenshot, or a short GIF',
	media: undefined as Media | undefined,
};
