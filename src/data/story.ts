// My story: the storybook on /journey (also the visual for the Career Deep Dive).
//
// How to add photos: drop files into public/story/ (webp or jpg, about 1600px wide) and add them to a
// page's `media`, e.g. media: [{ src: '/story/ddx-2026.jpg', alt: 'Me at DDX San Diego' }].
// Videos: { src: '/story/clip.mp4', poster: '/story/clip.jpg', alt: '...', video: true }.
// A page with no media shows text only (no placeholder boxes).
//
// Years on `start`/`end` are decimals: 2019.0 = Jan 2019, 2021.25 = Apr 2021.

export type Media = { src: string; alt: string; poster?: string; video?: boolean; fit?: 'contain' };
export type Num = { v: string; l: string };
export type Page = {
	kind: 'chapter' | 'highlight';
	kicker?: string;
	place: string;
	date: string;
	title: string;
	text: string;
	nums?: Num[];
	ladder?: { t: string; when: string }[];
	quote?: { q: string; who: string };
	media?: Media[];
	link?: { href: string; label: string; external?: boolean };
};
export type Chapter = {
	id: string;
	name: string;
	role: string;
	lane: 'school' | 'work' | 'side';
	start: number;
	end: number;
	now?: boolean;
	pages: Page[];
};

export const NOW = 2026.9;

export const chapters: Chapter[] = [
	{
		id: 'jmu', name: 'JMU', role: 'Media Arts & Design', lane: 'school', start: 2015.67, end: 2017.4,
		pages: [
			{
				kind: 'chapter', place: 'James Madison University · Virginia', date: 'Fall 2015 – Spring 2017',
				title: 'Where design met code.',
				text: 'Media Arts and Design with an interactive design concentration, plus computer information systems in the business school. A foot in both worlds is why I still prototype in code.',
			},
		],
	},
	{
		id: 'paper', name: 'Paper Airplane', role: 'First design job', lane: 'work', start: 2017.4, end: 2018.3,
		pages: [
			{
				kind: 'chapter', place: 'Paper Airplane · Boston', date: '2017',
				title: 'I did anything and everything.',
				text: 'An early-stage dating app for meeting people in person. I did brand and guerrilla marketing, research and UI for the product, and worked with developers on the APIs.',
				nums: [{ v: '41', l: 'survey responses' }, { v: '13', l: 'final screens, from 4 interviews and 6 card sorts' }],
				media: [{ src: '/paper-airplane/screen-01.webp', alt: 'Paper Airplane app screen', fit: 'contain' }, { src: '/paper-airplane/brand-1.webp', alt: 'Paper Airplane brand' }, { src: '/paper-airplane/card-sort.webp', alt: 'Card sort' }],
				link: { href: '/work/paper-airplane', label: 'Read the case study' },
			},
		],
	},
	{
		id: 'pratt', name: 'Pratt', role: 'UX/UI certificate', lane: 'school', start: 2018.4, end: 2018.7,
		pages: [
			{
				kind: 'chapter', place: 'Pratt Institute · New York', date: 'Summer 2018',
				title: 'I learned the craft, then tested it with real people.',
				text: 'A UX/UI mobile design certificate turned instinct into method: user design research, interface design, and My Trips, a capstone for spontaneous travelers.',
				nums: [{ v: '−94%', l: 'time to share a trip in My Trips, in testing' }],
				media: [{ src: '/journey/pratt-scrapbook.png', alt: 'Pratt scrapbook', fit: 'contain' }],
			},
			{
				kind: 'highlight', kicker: 'In-person testing', place: 'New York', date: 'Summer 2018',
				title: 'People dropped off when I asked them to review everything at once.',
				text: 'So I added daily review prompts. My first lesson in designing for how people actually behave.',
				media: [{ src: '/journey/usertesting.mp4', poster: '/journey/usertesting-poster.jpg', alt: 'Card sorting and usability testing sessions', video: true }],
			},
			{
				kind: 'highlight', kicker: 'Cooper Hewitt', place: 'New York', date: '2018',
				title: 'New York made me obsessed with design.',
				text: 'The Cooper Hewitt became my favorite museum, and where I started to see the psychology and empathy behind design.',
				media: [{ src: '/journey/cooper-hewitt-scrapbook.png', alt: 'Cooper Hewitt scrapbook', fit: 'contain' }],
			},
		],
	},
	{
		id: 'freelance', name: 'Freelance', role: 'Product design', lane: 'side', start: 2018, end: NOW, now: true,
		pages: [
			{
				kind: 'chapter', place: 'Independent', date: '2018 – now',
				title: 'Always a few side quests.',
				text: 'Alongside full-time roles I’ve freelanced across industries. It keeps me fast at learning new domains.',
				nums: [{ v: '5', l: 'industries: healthcare, finance, travel, construction, digital media' }],
			},
		],
	},
	{
		id: 'amwell', name: 'Amwell', role: 'UX Designer → Senior Product Designer', lane: 'work', start: 2019, end: 2024.1,
		pages: [
			{
				kind: 'chapter', place: 'Amwell · Boston and New York', date: 'Jan 2019 – Feb 2024',
				title: 'Research, then ownership, then leadership.',
				text: 'Virtual urgent care used by millions: patient, provider and admin experiences on web and white-label mobile. I started by running research and grew into owning design direction and mentoring designers.',
				ladder: [{ t: 'UX Designer', when: '2019' }, { t: 'Senior UX Designer', when: '2021' }, { t: 'Senior Product Designer', when: '2023' }],
				nums: [{ v: '2', l: 'promotions' }, { v: '14', l: 'OKRs completed' }, { v: '45% → 82%', l: 'admin task completion after my redesign' }, { v: '2', l: 'designers mentored' }],
				media: [{ src: '/amwell/cs/hero.webp', alt: 'Amwell admin portal' }, { src: '/amwell/framework-nav.jpg', alt: 'Admin framework navigation' }, { src: '/amwell/wireframes.jpg', alt: 'Wireframes' }],
				link: { href: '/work/amwell', label: 'See the Amwell work' },
			},
			{
				kind: 'highlight', kicker: 'Research', place: 'Amwell', date: '2019 – 2020',
				title: 'My research fed a #1 J.D. Power ranking.',
				text: 'I led most of the team’s user research (interviews, usability tests, surveys) and presented it to the C-suite. The patient experience work helped Amwell rank #1 in J.D. Power patient satisfaction.',
				nums: [{ v: '~86%', l: 'of the team’s user research, led by me' }, { v: '#1', l: 'J.D. Power patient satisfaction, as a team' }],
			},
			{
				kind: 'highlight', kicker: 'Speaking', place: 'General Assembly · Boston', date: 'As a UX Designer at Amwell',
				title: 'I joined a General Assembly panel on design careers.',
				text: 'A General Assembly panel on design and career development, speaking as a UX designer in telehealth.',
				link: { href: 'https://www.generalassemb.ly/instructors/casey-flood/22082', label: 'My General Assembly profile', external: true },
			},
			{
				kind: 'highlight', kicker: 'Conference', place: 'UserTesting', date: 'Early at Amwell',
				title: 'Learning from the research community.',
				text: 'I went to UserTesting’s conference in my first years at Amwell, when research was most of my job.',
			},
			{
				kind: 'highlight', kicker: 'Craft', place: 'Amwell', date: '2023',
				title: 'One admin portal for every role.',
				text: 'I redesigned a fragmented admin portal into one role-based system. Task completion rose from 45% to 82%.',
				media: [{ src: '/amwell/cs/sketches.webp', alt: 'Sketches' }, { src: '/amwell/collapserator.jpg', alt: 'Collapsible navigation exploration' }, { src: '/amwell/cs/final.webp', alt: 'Final design' }],
				link: { href: '/work/amwell-admin-portal', label: 'Read the case study' },
			},
		],
	},
	{
		id: 'dandy', name: 'Dandy', role: 'Senior Product Designer', lane: 'work', start: 2025.17, end: NOW, now: true,
		pages: [
			{
				kind: 'chapter', place: 'Dandy · San Diego', date: 'Mar 2025 – now',
				title: 'Today, I design in the real material.',
				text: 'First the dentist ordering flows, then sole product designer on the Design Editor, where dental designers design every crown. I prototype in code and built its design system.',
				nums: [{ v: '−11.5%', l: 'hands-on designer time per order' }, { v: '+18 pts', l: 'share of crown orders in our editor' }],
				quote: { q: 'Exceeding expectations for this stage in her tenure, with a strong trajectory toward broader leadership.', who: 'Mid-year review, 2025' },
				media: [{ src: '/work/dde/hero.jpg', alt: 'The Design Editor' }],
				link: { href: '/work/dandy-design-editor', label: 'Read the Design Editor case study' },
			},
			{
				kind: 'highlight', kicker: 'Week three', place: 'Dandy', date: 'Spring 2025',
				title: 'I shipped a feedback flow in my third week.',
				text: 'For the Goldilocks crown-fit program. It got the program’s best feedback rates, and the follow-up form went from ticket to done in under an hour.',
				nums: [{ v: '+100%', l: 'feedback page views' }, { v: '+60%', l: 'submissions' }],
			},
			{
				kind: 'highlight', kicker: 'Field research', place: 'Cairo, Egypt', date: '2025 – 2026',
				title: 'I went to where the work happens.',
				text: 'San Diego to Cairo, to watch dental designers at their own desks and run roundtables with the leads.',
				nums: [{ v: '7,600+', l: 'miles, one way' }, { v: '10+', l: 'designer 1:1s, plus 2 roundtables' }],
				media: [{ src: '/work/dde/cairo-team.webp', alt: 'The team in Cairo' }, { src: '/work/dde/office-wide.webp', alt: 'The design lab in Cairo' }, { src: '/work/dde/cairo-giza.webp', alt: 'Giza' }],
			},
			{
				kind: 'highlight', kicker: 'Design engineering', place: 'Dandy', date: '2025',
				title: 'I built the editor’s design system in code.',
				text: 'In Storybook, from production components. Each design change went from 30–45 minutes in Figma to 5–10 in code.',
				media: [{ src: '/journey/storybook-ds.mp4', poster: '/journey/storybook-ds-cover.jpg', alt: 'Walkthrough of the design system', video: true }],
				link: { href: '/work/dandy-design-system', label: 'Read more' },
			},
			{
				kind: 'highlight', kicker: 'Conference', place: 'DDX’26 · San Diego', date: 'Sep 17, 2026',
				title: 'The inflection point.',
				text: '300+ design and product leaders, one question: if AI makes “good enough” free, what is the job now? I was in the room.',
			},
		],
	},
];
