// My story (/journey): a year rail, one chapter at a time, and the moments inside it.
//
// Add photos: drop files in public/story/ (webp or jpg, ~1600px wide) and reference them, e.g.
//   media: { src: '/story/ddx-2026.jpg', alt: 'Me at DDX San Diego' }
// Videos: { src: '/story/clip.mp4', poster: '/story/clip.jpg', alt: '...', video: true }
// A moment without media shows as a text card (no empty boxes).

export type Media = { src: string; alt: string; poster?: string; video?: boolean; fit?: 'contain' };
export type Num = { v: string; l: string };
export type Moment = { kicker: string; date: string; title: string; text: string; num?: Num; media?: Media; link?: { href: string; label: string; external?: boolean } };
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
	media?: Media;
	link?: { href: string; label: string };
	moments: Moment[];
};

export const chapters: Chapter[] = [
	{
		id: 'jmu', year: '2015', name: 'JMU', role: 'Media Arts & Design', dates: 'Fall 2015 – Spring 2017', place: 'James Madison University, Virginia',
		title: 'Where design met code.',
		text: 'Media Arts and Design with an interactive design concentration, plus computer information systems in the business school. A foot in both worlds is why I still prototype in code.',
		moments: [],
	},
	{
		id: 'paper', year: '2017', name: 'Paper Airplane', role: 'First design job', dates: '2017', place: 'Boston',
		title: 'I did anything and everything.',
		text: 'An early-stage app for meeting people in person. Brand and guerrilla marketing, research and UI for the product, and working with developers on the APIs.',
		nums: [{ v: '41', l: 'survey responses' }, { v: '13', l: 'final screens' }],
		media: { src: '/paper-airplane/screen-01.webp', alt: 'Paper Airplane app screen', fit: 'contain' },
		link: { href: '/work/paper-airplane', label: 'Read the case study' },
		moments: [
			{ kicker: 'Brand', date: '2017', title: 'Guerrilla marketing around Boston.', text: 'I helped shape the brand and got the app in front of people on the street.', media: { src: '/paper-airplane/brand-1.webp', alt: 'Paper Airplane brand material' } },
			{ kicker: 'Research', date: '2017', title: 'From survey to MVP.', text: 'Surveys, interviews and card sorts narrowed the product to three features.', num: { v: '6', l: 'card sorts' }, media: { src: '/paper-airplane/card-sort.webp', alt: 'Card sort' } },
		],
	},
	{
		id: 'pratt', year: '2018', name: 'Pratt', role: 'UX/UI certificate', dates: 'Summer 2018', place: 'Pratt Institute, New York',
		title: 'I learned the craft, then tested it with real people.',
		text: 'A UX/UI mobile design certificate turned instinct into method. The same year I started freelancing, which I’ve kept up alongside every full-time role since.',
		nums: [{ v: '−94%', l: 'time to share a trip in My Trips' }, { v: '5', l: 'industries freelanced in' }],
		media: { src: '/journey/pratt-scrapbook.png', alt: 'Pratt scrapbook', fit: 'contain' },
		moments: [
			{ kicker: 'Testing', date: 'Summer 2018', title: 'People dropped off when asked to review everything at once.', text: 'So I added daily review prompts.', media: { src: '/journey/usertesting.mp4', poster: '/journey/usertesting-poster.jpg', alt: 'In-person testing sessions', video: true } },
			{ kicker: 'New York', date: '2018', title: 'The Cooper Hewitt.', text: 'Where I started to see the psychology and empathy behind design.', media: { src: '/journey/cooper-hewitt-scrapbook.png', alt: 'Cooper Hewitt scrapbook', fit: 'contain' } },
			{ kicker: 'Freelance', date: '2018 – now', title: 'Always a few side quests.', text: 'Healthcare, finance, travel, construction and digital media. It keeps me fast at learning new domains.' },
		],
	},
	{
		id: 'amwell', year: '2019', name: 'Amwell', role: 'UX Designer → Senior Product Designer', dates: 'Jan 2019 – Feb 2024', place: 'Boston and New York',
		title: 'Research, then ownership, then leadership.',
		text: 'Virtual urgent care used by millions: patient, provider and admin experiences on web and white-label mobile. I started by running research and grew into owning design direction and mentoring designers.',
		ladder: [{ t: 'UX Designer', when: '2019' }, { t: 'Senior UX Designer', when: '2021' }, { t: 'Senior Product Designer', when: '2023' }],
		nums: [{ v: '2', l: 'promotions' }, { v: '14', l: 'OKRs completed' }, { v: '45% → 82%', l: 'admin task completion' }],
		media: { src: '/amwell/cs/hero.webp', alt: 'Amwell admin portal' },
		link: { href: '/work/amwell', label: 'See the Amwell work' },
		moments: [
			{ kicker: 'Research', date: '2019 – 2020', title: 'My research fed a #1 J.D. Power ranking.', text: 'I led most of the team’s user research and presented it to the C-suite.', num: { v: '~86%', l: 'of the team’s research, led by me' } },
			{ kicker: 'Speaking', date: 'As a UX Designer', title: 'General Assembly panel.', text: 'On design and career development, as a UX designer in telehealth.', link: { href: 'https://www.generalassemb.ly/instructors/casey-flood/22082', label: 'GA profile', external: true } },
			{ kicker: 'Conference', date: 'Early at Amwell', title: 'UserTesting’s conference.', text: 'Learning from the research community when research was most of my job.' },
			{ kicker: 'Craft', date: '2023', title: 'One admin portal for every role.', text: 'A fragmented portal became one role-based system.', num: { v: '45% → 82%', l: 'task completion' }, media: { src: '/amwell/cs/sketches.webp', alt: 'Admin portal sketches' }, link: { href: '/work/amwell-admin-portal', label: 'Case study' } },
			{ kicker: 'Leadership', date: '2023', title: 'Mentoring designers.', text: 'I mentored two junior designers and led sprints and critiques.', num: { v: '2', l: 'designers mentored' } },
		],
	},
	{
		id: 'dandy', year: '2025', name: 'Dandy', role: 'Senior Product Designer', dates: 'Mar 2025 – now', place: 'San Diego',
		title: 'Today, I design in the real material.',
		text: 'First the dentist ordering flows, then sole product designer on the Design Editor, where dental designers design every crown. I prototype in code and built its design system.',
		nums: [{ v: '−11.5%', l: 'hands-on designer time per order' }, { v: '+18 pts', l: 'crown orders in our editor' }],
		quote: { q: 'Exceeding expectations for this stage in her tenure, with a strong trajectory toward broader leadership.', who: 'Mid-year review, 2025' },
		media: { src: '/work/dde/hero.jpg', alt: 'The Design Editor' },
		link: { href: '/work/dandy-design-editor', label: 'Read the Design Editor case study' },
		moments: [
			{ kicker: 'Week three', date: 'Spring 2025', title: 'A feedback flow, shipped in my third week.', text: 'For the Goldilocks crown-fit program: the program’s best feedback rates.', num: { v: '+60%', l: 'submissions' } },
			{ kicker: 'Field research', date: '2025 – 2026', title: 'San Diego to Cairo.', text: 'Watching dental designers at their own desks, and roundtables with the leads.', num: { v: '7,600+', l: 'miles, one way' }, media: { src: '/work/dde/cairo-team.webp', alt: 'The team in Cairo' } },
			{ kicker: 'Design engineering', date: '2025', title: 'A design system in code.', text: 'Built in Storybook from production components.', num: { v: '30–45 → 5–10', l: 'minutes per design change' }, media: { src: '/journey/storybook-ds.mp4', poster: '/journey/storybook-ds-cover.jpg', alt: 'The design system', video: true }, link: { href: '/work/dandy-design-system', label: 'Read more' } },
			{ kicker: 'Conference', date: 'Sep 17, 2026', title: 'DDX’26 San Diego.', text: '300+ design and product leaders, one question: if AI makes “good enough” free, what is the job now?' },
		],
	},
];
