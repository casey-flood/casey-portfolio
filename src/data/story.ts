// My story (/journey): one moment at a time.
//
// Add photos: drop files in public/story/ (webp or jpg, ~1600px wide) and reference them, e.g.
//   media: { src: '/story/ddx-2026.webp', alt: 'Me at DDX San Diego' }
// `pos` sets the crop focus for portrait photos, e.g. pos: '50% 30%'.
// Videos: { src: '/story/clip.mp4', poster: '/story/clip.jpg', alt: '...', video: true }
// A moment without media shows as a text card (no empty boxes).

export type Media = { src: string; alt: string; poster?: string; video?: boolean; fit?: 'contain'; pos?: string; bare?: boolean };
export type Num = { v: string; l: string };
export type Moment = { kicker: string; date: string; title: string; text: string; num?: Num; quote?: { q: string; who: string }; media?: Media | Media[]; link?: { href: string; label: string; external?: boolean } };
export type Chapter = {
	id: string;
	year: string;
	name: string;
	role: string;
	dates: string;
	place: string;
	title: string;
	text: string;
	nums?: Num[];
	ladder?: { t: string; when: string }[];
	quote?: { q: string; who: string };
	media?: Media | Media[];
	link?: { href: string; label: string };
	moments: Moment[];
};

export const chapters: Chapter[] = [
	{
		id: 'origins', year: 'Early', name: 'Origins', role: 'Where it started', dates: 'Growing up', place: 'Before it was a job',
		title: 'I’ve always seen the world a little differently.',
		text: 'I was the kid redesigning her own class notes: color, size and type, until the information clicked. Turns out that’s a job.',
		media: [
			{ src: '/story/birthday.mp4', poster: '/story/birthday.jpg', alt: 'Blowing out birthday candles, on home video', video: true },
			{ src: '/story/young-highchair.webp', alt: 'Me in a high chair, very focused', pos: '55% 35%' },
			{ src: '/story/young-laughing.webp', alt: 'Laughing with my sister' },
			{ src: '/story/young-dad.webp', alt: 'With my dad at an overlook', pos: '40% 40%' },
		],
		moments: [
			{ kicker: 'Project manager + webmaster', date: 'Wellesley High School', title: 'My first design project had real stakes.', text: 'A class venture selling metal art by artisans in Cité Soleil, Haiti, to fund a local clinic. I designed pieces and ran the website.', num: { v: '$45K+', l: 'in artisans’ work bought through the program, across 150+ students. Its first year alone helped 140 people.' }, media: { src: '/story/creative-haiti.webp', alt: 'Selling the artisans’ metal art at a local market', pos: '60% 50%' }, link: { href: 'https://www.bostonglobe.com/metro/regionals/west/2016/01/29/wellesley-retiree-opens-students-eyes-third-world-issues/qDJD3W20uGUKcmpWse7NMI/story.html', label: 'About the program', external: true } },
		],
	},
	{
		id: 'jmu', year: '2015', name: 'JMU', role: 'Media Arts & Design + CIS', dates: 'Fall 2015 – Spring 2017', place: 'James Madison University, Virginia',
		title: 'Design and code, from day one.',
		text: 'Plus Delta Sigma Pi, the business fraternity. I paid my own way, so every class had to earn it.',
		media: { src: '/story/jmu-essay-2017.webp', alt: 'From my 2017 application essay to JMU’s School of Media Arts & Design', bare: true },
		moments: [
			{
				kicker: 'The pivot', date: 'Spring 2017',
				title: 'I paused school to test the field first.',
				text: 'The degree was spread across journalism, film and everything in between. I wanted UX, so before paying for more school, I went to find out if I was right.',
				media: { src: '/story/jmu-leave-notice.webp', alt: 'JMU leave of absence notice from the Office of the Registrar, May 4, 2017', fit: 'contain' },
			},
		],
	},
	{
		id: 'paper', year: '2017', name: 'Paper Airplane', role: 'First design job', dates: '2017', place: 'Paper Airplane',
		title: 'The field confirmed it: UX was the work.',
		text: 'At an early-stage app for meeting people in person, I did a bit of everything: brand and guerrilla marketing, research and UI for the product, and working with developers on the APIs.',
		nums: [{ v: '41', l: 'survey responses' }, { v: '13', l: 'final screens' }],
		media: { src: '/paper-airplane/story-trio.webp', alt: 'Three Paper Airplane screens: the venue map, a venue with matches, and chat' },
		link: { href: '/work/paper-airplane', label: 'Read the case study' },
		moments: [
		],
	},
	{
		id: 'pratt', year: '2018', name: 'Pratt', role: 'UX/UI certificate', dates: '2018', place: 'Pratt Institute, New York',
		title: 'Then I trained for it, on purpose.',
		text: 'Instead of a broad degree, I chose a UX/UI mobile design certificate at Pratt. It’s where I first learned user testing, like card sorts and task analysis, and the craft: Figma, components and design systems. The same year I started freelancing, which I’ve kept up alongside every role since.',
		nums: [{ v: 'All A’s', l: 'across the 4 certificate courses' }],
		media: [{ src: '/story/pratt-entrance.webp', alt: 'Me outside Pratt Institute in Manhattan', pos: '50% 22%' }, { src: '/story/pratt-sketches.webp', alt: 'Early sketches for my capstone app' }, { src: '/story/pratt-class.webp', alt: 'My Pratt UX/UI certificate class' }, { src: '/story/pratt-transcript.webp', alt: 'Pratt official transcript: four courses, all A’s', fit: 'contain' }],
		moments: [
			{ kicker: 'Capstone', date: 'Summer 2018', title: 'My first app, from idea to tested prototype: MyTrips.', text: 'I came up with the concept from my own research with spontaneous travelers, then owned every step solo: interviews, synthesis, information architecture, UI and usability testing.', num: { v: '−94%', l: 'time to share a trip, in testing' }, media: [{ src: '/mytrips/empathy-wall.webp', alt: 'Building the MyTrips empathy map at Pratt' }, { src: '/journey/usertesting.mp4', poster: '/journey/usertesting-poster.jpg', alt: 'Card sorts and prototype testing sessions', video: true }, { src: '/mytrips/card-sort.webp', alt: 'A moderated open card sort for MyTrips' }], link: { href: '/work/mytrips', label: 'MyTrips case study' } },
			{ kicker: 'New York', date: '2018', title: 'New York made me obsessed with design.', text: 'Living in one of the biggest design communities in the world, with the Cooper Hewitt as my favorite museum.', media: [{ src: '/story/nyc-2018.webp', alt: 'On the Met rooftop above Central Park' }, { src: '/story/cooper-entrance.webp', alt: 'The Cooper Hewitt, Smithsonian Design Museum' }, { src: '/story/cooper-wall.webp', alt: 'A wall of packaging designs at the Cooper Hewitt' }, { src: '/story/cooper-glasses.webp', alt: 'Trying the 3D glasses in a Cooper Hewitt exhibit' }] },
			{ kicker: 'Art school', date: 'Fall 2018 · Boston', title: 'I tried art school, then chose the work.', text: 'A semester at MassArt, with A’s. But the BFA meant four more years of studio classes before any interaction design. So I freelanced, applied for UX roles, and joined Amwell that January.', media: [{ src: '/story/massart-drawings-detail.webp', alt: 'Drawings from my time at MassArt' }, { src: '/story/massart-transcript.webp', alt: 'MassArt transcript, Fall 2018: two A’s, with my Pratt work transferred in as design credit', fit: 'contain' }, { src: '/story/massart-campus.webp', alt: 'Outside MassArt, September 2018', pos: '35% 40%' }] },
		],
	},
	{
		id: 'amwell', year: '2019', name: 'Amwell', role: 'UX Designer → Senior Product Designer', dates: 'Jan 2019 – Feb 2024', place: 'Amwell',
		title: 'Research, then ownership, then leadership.',
		text: 'Telehealth for patients, providers and admins. I started by running research and grew into owning design direction.',
		nums: [{ v: '2', l: 'promotions' }, { v: '86%', l: 'of our research, led by me' }],
		media: { src: '/amwell/admin-dashboard.webp', alt: 'The Amwell admin portal I redesigned' },
		link: { href: '/work/amwell', label: 'See the Amwell work' },
		moments: [
			{ kicker: 'Conference', date: '2019', title: 'The Human Insight Summit.', text: 'UserTesting’s research conference in my first year, when research was most of my job.', media: { src: '/story/usertesting-this-2019.webp', alt: 'The stage at UserTesting’s Human Insight Summit, 2019' } },
			{ kicker: 'Research', date: '2019 – 2020', title: 'My research fed a #1 J.D. Power ranking.', text: 'I led 86% of our research, mostly on the patient experience. I presented findings to the C-suite and turned them into design changes, work that helped Amwell rank #1 in J.D. Power’s 2020 telehealth satisfaction study.', media: { src: '/story/jd-power-2020.svg', alt: 'J.D. Power 2020 U.S. Telehealth Satisfaction Study, direct-to-consumer: Amwell 885, ranked #1, above Doctor on Demand 879, segment average 856, Teladoc 854 and MDLIVE 843', fit: 'contain' }, link: { href: 'https://business.amwell.com/about-us/news/press-releases/2020/amwell-ranked-no-1-in-the-j-d-power-2020-u-s-telehealth-satisfaction-study', label: 'The announcement', external: true } },
			{ kicker: 'Speaking', date: 'Boston', title: 'On a General Assembly panel.', text: 'A panel on design and career development, speaking as a UX designer at Amwell.', media: { src: '/story/ga-panel.webp', alt: 'Casey speaking on a General Assembly panel in Boston', pos: '30% 40%' }, link: { href: 'https://www.generalassemb.ly/instructors/casey-flood/22082', label: 'GA profile', external: true } },
			{ kicker: 'Degree', date: 'Aug 2021', title: 'I finished my degree while working full time.', text: 'A B.S. in Information Technology from UMass Lowell, with a concentration in design and development, completed online while I was a designer at Amwell. Design and development: the combination I’d wanted from the start.', num: { v: 'Magna cum laude', l: 'Aug 31, 2021' }, media: { src: '/story/umass-lowell-pair.webp', alt: 'UMass Lowell diploma, Bachelor of Science in Information Technology, magna cum laude, with Casey in cap and gown', bare: true } },
			{ kicker: 'Craft', date: '2023', title: 'One admin portal for every role.', text: 'A fragmented portal became one role-based system.', num: { v: '45% → 82%', l: 'task completion' }, media: [{ src: '/amwell/admin-dashboard.webp', alt: 'The redesigned admin portal dashboard' }, { src: '/amwell/cs/admin-portal.webp', alt: 'Before: the old administration console', fit: 'contain' }, { src: '/amwell/story-ia.webp', alt: 'Information architecture I mapped for service lines', fit: 'contain' }, { src: '/amwell/story-wireframe.webp', alt: 'A wireframe of the super admin dashboard', fit: 'contain' }, { src: '/amwell/cs/ui-explore.webp', alt: '113 UI designs I explored for the portal' }, { src: '/amwell/story-component.webp', alt: 'Spacing specs for a sliding panel component', fit: 'contain' }], link: { href: '/work/amwell-admin-portal', label: 'Case study' } },
			{ kicker: 'Leadership', date: '2019 – 2024', title: 'I mentored designers and led our critiques.', text: 'I mentored two junior designers and ran our team’s design sprints and critiques.', quote: { q: 'The first person I turn to when I’m seeking input on my designs.', who: 'Kate Murdoch, Principal Product Designer' }, media: { src: '/story/amwell-team.webp', alt: 'The Amwell team' } },
			{ kicker: 'In their words', date: 'Amwell, 2023', title: '“She understands the bones of good design.”', text: 'Missy Roode, Amwell', quote: { q: 'A fantastic mentor and leader.', who: 'Claudiane Philippe, Amwell' } },
		],
	},
	{
		id: 'dandy', year: '2025', name: 'Dandy', role: 'Senior Product Designer', dates: 'Mar 2025 – now', place: 'Dandy',
		title: 'Today, I design in the real material.',
		text: 'Sole designer on the editor where every crown is designed. I prototype in code.',
		nums: [{ v: '−11.5%', l: 'designer time per order' }],
		quote: { q: 'A strong trajectory toward broader leadership.', who: 'Mid-year review, 2025' },
		media: { src: '/work/dde/hero.jpg', alt: 'The Design Editor' },
		link: { href: '/work/dandy-design-editor', label: 'Read the Design Editor case study' },
		moments: [
			{ kicker: 'Week three', date: 'Spring 2025', title: 'A feedback flow, shipped in my third week.', text: 'For the Goldilocks crown-fit program: the program’s best feedback rates.', num: { v: '+60%', l: 'submissions' }, media: [{ src: '/story/dandy/feedback-form.webp', alt: 'The crown feedback form for dentists', fit: 'contain' }, { src: '/story/dandy/feedback-banner.webp', alt: 'A credit banner inviting dentists to give order feedback', fit: 'contain' }] },
			{ kicker: 'Perfect Fit', date: '2025', title: 'Three crowns, one right fit.', text: 'Dentists get three crowns with slightly different contacts and seat the one that fits. I took the offer from a dense explainer to one clear choice.', media: [{ src: '/story/dandy/pf-final.webp', alt: 'The final Perfect Fit step in the order flow' }, { src: '/story/dandy/pf-v2.webp', alt: 'An earlier iteration comparing Perfect Fit with a regular order' }, { src: '/story/dandy/pf-v1.webp', alt: 'The first iteration, with a long explainer' }] },
			{ kicker: 'Field research', date: '2025 – 2026', title: 'San Diego to Cairo.', text: 'Watching dental designers at their own desks, and roundtables with the leads.', num: { v: '7,600+', l: 'miles, one way' }, media: { src: '/work/dde/cairo-team.webp', alt: 'The team in Cairo' } },
			{ kicker: 'Design engineering', date: '2025', title: 'A design system in code.', text: 'Built in Storybook from production components.', num: { v: '30–45 → 5–10', l: 'minutes per design change' }, media: { src: '/journey/storybook-ds.mp4', poster: '/journey/storybook-ds-cover.jpg', alt: 'The design system', video: true }, link: { href: '/work/dandy-design-system', label: 'Read more' } },
			{ kicker: 'Presenting', date: 'Apr 2026 · New York', title: 'From siloed UIs to one DDE shell.', text: 'I flew to New York to show Dandy’s EPD org how I prototype the Design Editor in code with Storybook and Cursor, then had dinner with the team.', media: [{ src: '/story/nyc-2026-presenting.webp', alt: 'My talk on screen: From siloed UIs to one DDE shell' }, { src: '/story/nyc-2026-dinner.webp', alt: 'Dinner with the Dandy team in New York', pos: '50% 40%' }] },
			{ kicker: 'AI community', date: 'Apr 28, 2026 · New York', title: 'Double Diamond Demo Night.', text: 'Same trip: an evening of live AI design demos from Cursor, Vercel and Jamey Gannon. Where I pick up new ways of working and bring them back to the team.', media: [{ src: '/story/double-diamond-demo.mp4', poster: '/story/double-diamond-demo.jpg', alt: 'Jamey Gannon demoing her AI image workflow', video: true }, { src: '/story/double-diamond.webp', alt: 'Double Diamond Demo Night, April 28, NYC', fit: 'contain' }] },
			{ kicker: 'Community', date: 'San Diego', title: 'Volunteering with SDXD.', text: 'I volunteer at San Diego Experience Design events for the local design community.', media: { src: '/story/sdxd.webp', alt: 'Casey after an SDXD event', pos: '50% 30%' } },
			{ kicker: 'Conference', date: 'Sep 17, 2026 · San Diego', title: 'DDX’26 San Diego.', text: '300+ design and product leaders, one question: if AI makes “good enough” free, what is the job now? Talks on designing decisions, not screens.', media: [{ src: '/story/ddx-badge.webp', alt: 'At DDX’26 San Diego with my badge', pos: '50% 30%' }, { src: '/story/ddx-stage.webp', alt: 'A DDX talk: Different structures. Different assumptions.' }, { src: '/story/ddx-badge-flat.webp', alt: 'DDX badge: Think. Innovate. Repeat.' }] },
		],
	},
];
