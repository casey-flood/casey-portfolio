// Career at a glance: the Gantt timeline at the top of My story (used for the Career Deep Dive).
// Years are decimals: 2019.0 = Jan 2019, 2021.25 = Apr 2021. `approx: true` fades the bar's left edge
// (start date not confirmed yet). Fill in `nums` as you confirm them; an item with no nums shows none.

export type Num = { v: string; l: string };
export type Step = { t: string; start: number; end: number };
export type CareerItem = {
	id: string;
	lane: 'school' | 'work' | 'side';
	org: string;
	role: string;
	start: number;
	end: number;
	now?: boolean;
	approx?: boolean;
	place?: string;
	dates: string;
	title: string;
	text: string;
	steps?: Step[];
	nums: Num[];
	media?: { src: string; alt: string }[];
	link?: { href: string; label: string };
};

export const lanes = [
	{ id: 'school', label: 'School' },
	{ id: 'work', label: 'Full-time' },
	{ id: 'side', label: 'Independent' },
] as const;

export const NOW = 2026.9;

export const career: CareerItem[] = [
	{
		id: 'jmu', lane: 'school', org: 'JMU', role: 'Media Arts & Design', start: 2015.67, end: 2017.4,
		place: 'James Madison University', dates: 'Fall 2015 – Spring 2017',
		title: 'Where design met code.',
		text: 'Media Arts and Design with an interactive design concentration, plus computer information systems in the business school: a foot in both worlds. It’s why I still prototype in code.',
		nums: [],
	},
	{
		id: 'paper', lane: 'work', org: 'Paper Airplane', role: 'First design job', start: 2017.4, end: 2018.3,
		place: 'Boston', dates: '2017',
		title: 'I did anything and everything.',
		text: 'An early-stage dating app: brand and guerrilla marketing, research and UI for the product, and working with developers on the APIs.',
		nums: [{ v: '41', l: 'survey responses' }, { v: '13', l: 'final screens, from 4 interviews and 6 card sorts' }],
		media: [{ src: '/paper-airplane/brand-1.webp', alt: 'Paper Airplane brand' }, { src: '/paper-airplane/screen-01.webp', alt: 'App screen' }, { src: '/paper-airplane/card-sort.webp', alt: 'Card sort' }],
		link: { href: '/work/paper-airplane', label: 'Read the case study' },
	},
	{
		id: 'pratt', lane: 'school', org: 'Pratt', role: 'UX/UI certificate', start: 2018.4, end: 2018.7,
		place: 'Pratt Institute · New York', dates: 'Summer 2018',
		title: 'I learned the craft, then tested it with real people.',
		text: 'A UX/UI mobile design certificate turned instinct into method: user design research, interface design, in-person testing, and My Trips, a capstone for spontaneous travelers.',
		nums: [{ v: '−94%', l: 'time to share a trip in My Trips, in testing' }],
		media: [{ src: '/journey/pratt-scrapbook.png', alt: 'Pratt scrapbook' }, { src: '/journey/usertesting-poster.jpg', alt: 'In-person testing' }, { src: '/journey/cooper-hewitt-scrapbook.png', alt: 'Cooper Hewitt' }],
	},
	{
		id: 'freelance', lane: 'side', org: 'Freelance', role: 'Product design', start: 2018, end: NOW, now: true,
		place: 'caseyflood.design', dates: '2018 – now',
		title: 'Always a few side quests.',
		text: 'Alongside full-time roles I’ve freelanced across industries. It keeps me fast at learning new domains.',
		nums: [{ v: '5', l: 'industries: healthcare, finance, travel, construction, digital media' }],
	},
	{
		id: 'amwell', lane: 'work', org: 'Amwell', role: 'UX Designer → Senior Product Designer', start: 2019, end: 2024.1,
		place: 'Enterprise telehealth', dates: 'Jan 2019 – Feb 2024',
		title: 'Three titles in five years.',
		text: 'Virtual urgent care used by millions: patient, provider and admin experiences on web and white-label mobile. I grew from running research to owning design direction and mentoring designers.',
		steps: [
			{ t: 'UX Designer', start: 2019, end: 2021.25 },
			{ t: 'Senior UX Designer', start: 2021.25, end: 2023 },
			{ t: 'Senior Product Designer', start: 2023, end: 2024.1 },
		],
		nums: [
			{ v: '2', l: 'promotions' },
			{ v: '45% → 82%', l: 'admin task completion after my redesign' },
			{ v: '~86%', l: 'of user research led, as UX Designer' },
			{ v: '#1', l: 'J.D. Power patient satisfaction, as a team' },
			{ v: '2', l: 'designers mentored' },
		],
		media: [{ src: '/amwell/framework-nav.jpg', alt: 'Admin framework navigation' }, { src: '/amwell/wireframes.jpg', alt: 'Wireframes' }, { src: '/amwell/collapserator.jpg', alt: 'Collapsible navigation exploration' }],
		link: { href: '/work/amwell', label: 'See the Amwell work' },
	},
	{
		id: 'dandy', lane: 'work', org: 'Dandy', role: 'Senior Product Designer', start: 2025.17, end: NOW, now: true,
		place: 'Digital dental lab', dates: 'Mar 2025 – now',
		title: 'Today, I design in the real material.',
		text: 'First the dentist ordering flows, then sole product designer on the Design Editor, where dental designers design every crown. I prototype in code and built its design system.',
		nums: [
			{ v: '−11.5%', l: 'hands-on designer time per order' },
			{ v: '+18 pts', l: 'share of crown orders in our editor' },
			{ v: '30–45 → 5–10', l: 'minutes per design iteration, with the design system' },
			{ v: '7,600+', l: 'miles to Cairo for field research' },
		],
		media: [{ src: '/work/dde/hero.jpg', alt: 'The Design Editor' }, { src: '/journey/storybook-ds-cover.jpg', alt: 'The design system in Storybook' }, { src: '/scan-to-smile/04-design.webp', alt: 'Dental designers at work' }],
		link: { href: '/work/dandy-design-editor', label: 'Read the Design Editor case study' },
	},
];
