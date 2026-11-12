// Amwell research studies, from Casey's Notion research library.
// `changed` = what actually shipped (the "Changes made" field). `recs` = the study's design action items.

export type Viz =
	| { type: 'trend'; months: string[]; series: { l: string; v: number[]; tone: 'good' | 'bad' }[] }
	| { type: 'stats'; items: { v: string; l: string }[] }
	| { type: 'cards'; items: { t: string; d: string }[] }
	| { type: 'tiers'; items: { t: string; d: string[] }[] }
	| { type: 'flow'; steps: string[]; hi: number[]; notes?: string[] }
	| { type: 'phones'; screens: { src: string; cap?: string; tag?: string }[]; arrows?: boolean; gray?: boolean }
	| { type: 'steps'; items: string[] }
	| { type: 'pair'; items: { t: string; d: string[] }[] }
	| { type: 'annot'; src: string; notes: string[] }
	| { type: 'compare'; before: { src: string; cap: string }; after: { src: string; cap: string } };
export type Chapter = { k: string; t: string; d?: string; quote?: string; viz?: Viz };

export type Study = {
	slug: string;
	icon: string;
	t: string;
	method: string;
	area: string;
	goal: string;
	finding: string;
	changed: string[];
	recs: string[];
	result?: string;
	deck?: string;
	notion: string;
	related?: string[];
	// A visual story, from the original readout deck
	hero?: string;
	when?: string;
	stats?: { v: string; l: string }[];
	story?: Chapter[];
	results?: { from: string; to: string; l: string }[];
	takeaways?: string[];
};

const N = 'https://caseyflood.notion.site/';

export const studies: Study[] = [
	{
		slug: 'choosing-care',
		icon: '🧑🏻‍⚕️',
		t: 'The experience of choosing care',
		method: 'Needs assessment',
		area: 'Selecting care',
		goal: 'I led the research and redesign of how patients choose care in Amwell’s app, from the first data pull to the final UI.',
		finding: 'Most people overlooked the top navigation and search, and leaned on the back button instead, which made picking a service slow.',
		changed: ['Re-architected service selection', 'A browse-before-login flow', 'Symptom-based search'],
		result: '+12% patient satisfaction and −18% cancellations after the service selection redesign.',
		recs: ['Make the top navigation more prominent', 'Make search obvious from the first screen', 'Clearer paths so people don’t rely on the back button', 'Bring in the browsing patterns people created in co-creation sessions'],
		notion: N + 'The-Experience-of-Choosing-Care-1276f464642d8128a17acedc50af484a',
		related: ['patient-search', 'in-person-vs-amwell', 'dependent-care'],
		when: 'Senior Product Designer · 5 sprints',
		stats: [{ v: '15.5%', l: 'of visits were canceled when I started' }, { v: '65% → 92%', l: 'task completion in testing' }, { v: '−18%', l: 'cancellations after launch' }],
		story: [
			{ k: 'The problem', t: 'Canceled visits kept climbing.', d: 'On Amwell’s consumer app, cancellations rose every month. I set out to find out why.', viz: { type: 'trend', months: ['Jan', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], series: [{ l: 'Successful visits', v: [500, 600, 720, 850, 950, 1020], tone: 'good' }, { l: 'Canceled visits', v: [100, 120, 160, 210, 260, 310], tone: 'bad' }] } },
			{ k: 'The data', t: 'I started with the numbers.', d: 'I pulled visit types, NPS and drop-off from Looker, Google Analytics and UserTesting.', viz: { type: 'stats', items: [{ v: '50%', l: 'of completed visits were on iOS' }, { v: '34 · 16', l: 'NPS in two end-to-end tests, out of 100' }, { v: '#1', l: 'drop-off point: the practice page' }] } },
			{ k: 'The people', t: 'Then I watched 30 people choose care.', d: 'I ran an end-to-end usability study of the consumer app.', quote: 'If I selected urgent care, the next thing I would’ve thought would be a questionnaire to ask about my issue.', viz: { type: 'stats', items: [{ v: '30 / 30', l: 'never used the navigation or tabs' }, { v: '28 / 30', l: 'expected symptom questions, not another menu' }, { v: '0', l: 'options shaped by what they’d already told us' }] } },
			{ k: 'Why it matters', t: 'One mother never came back.', d: 'She couldn’t reach her doctor to refill a medication she’d taken for years. She tapped “Urgent care” because it said fastest, and was matched with a physician who couldn’t prescribe it.' },
			{ k: 'Root causes', t: 'I sorted every finding into four causes.', d: 'That let us fix each one in phases while still seeing the whole problem.', viz: { type: 'cards', items: [{ t: 'Dependents', d: 'No clear split between care for a child and for an adult.' }, { t: 'Practice page', d: 'An extra menu of brand names before any real choice.' }, { t: 'Routing', d: 'Nothing used what the patient told us to match them.' }, { t: 'Untreatable', d: 'Patients didn’t know what telehealth can’t treat.' }] } },
			{ k: 'Strategy', t: 'I phased the fix with PMs and engineers.', d: 'I designed the gold version first. Anything scoped down went to the backlog.', viz: { type: 'tiers', items: [{ t: 'Bronze', d: ['Clearer copy', 'What we can’t treat, in onboarding', 'A separate “Who is this visit for?”'] }, { t: 'Silver', d: ['Everything in bronze', 'Tags for the reason for the visit'] }, { t: 'Gold', d: ['Everything in silver', 'Re-architected service selection', 'Browse before logging in', 'Choose a reason from a list'] }] } },
			{ k: 'Architecture', t: 'I redrew the flow around three questions.', d: 'Who the visit is for decides adult or pediatric care. Location decides which providers are licensed. Then the right care options.', viz: { type: 'flow', steps: ['Sign up', 'Home', 'Who is this visit for?', 'Location', 'Care type', 'Intake', 'Review'], hi: [2, 3, 4] } },
			{ k: 'Concepts', t: 'I explored options fast, from our design system.', d: 'Engineering flagged symptom browsing as too heavy for the first release, so I cut it and kept the rest.', viz: { type: 'phones', gray: true, screens: [{ src: '/amwell-research/choosing-care/screens/concept-welcome.webp', cap: 'Browse before signing up' }, { src: '/amwell-research/choosing-care/screens/concept-reason.webp', cap: 'Reason for visit' }, { src: '/amwell-research/choosing-care/screens/concept-browse.webp', cap: 'Browse by symptom', tag: 'Cut for MVP' }] } },
			{ k: 'Iteration', t: 'One question per screen.', viz: { type: 'phones', gray: true, arrows: true, screens: [{ src: '/amwell-research/choosing-care/screens/wire-start.webp', cap: 'One way in' }, { src: '/amwell-research/choosing-care/screens/wire-who.webp', cap: 'Who it’s for' }, { src: '/amwell-research/choosing-care/screens/wire-location.webp', cap: 'Where you are' }, { src: '/amwell-research/choosing-care/screens/wire-care.webp', cap: 'Care options' }] } },
			{ k: 'Final UI', t: 'Clear choices, with cost up front.', d: 'I separated physical and mental health, explained timing, and showed the maximum cost on every option.', viz: { type: 'phones', arrows: true, screens: [{ src: '/amwell-research/choosing-care/screens/final-home.webp' }, { src: '/amwell-research/choosing-care/screens/final-who.webp' }, { src: '/amwell-research/choosing-care/screens/final-care.webp' }] } },
		],
		results: [{ from: '65%', to: '92%', l: 'task completion' }, { from: '5 min', to: '2.5 min', l: 'time on task' }, { from: '20%', to: '5%', l: 'error rate' }, { from: '3.2', to: '4.6', l: 'satisfaction, out of 5' }],
		takeaways: ['I traced canceled visits to how patients choose care, not the visit itself.', 'I pushed us toward a modular architecture that made the fix possible.', 'I owned more than design: research, roadmapping, requirements and prioritization.'],
	},
	{
		slug: 'dependent-care',
		icon: '👶🏻',
		t: 'Dependent care',
		method: 'Interviews',
		area: 'Selecting care',
		goal: 'I found out why visits for children kept getting canceled, and proposed the fix.',
		finding: 'Patients and providers both struggled. Confusion over who the visit was for, and where it should route, led to cancelled visits.',
		changed: ['Onboarding content on what we do and don’t treat for children', 'Provider training for pre-visit questions', 'No more pre-selected “Myself” answer'],
		recs: ['Make “Who is this visit for?” a required first question, with large buttons', 'Show only care options that fit that person', 'Separate dependent selection from other visit questions', 'Coach providers to confirm the patient before the visit'],
		deck: 'Dependent Flow UX Research',
		notion: N + 'Dependent-Care-1276f464642d81f58ea1d92b17ba5365',
		related: ['choosing-care'],
		when: 'UX Designer · August 2019',
		story: [
			{ k: 'The data', t: 'Providers were canceling children’s visits.', d: 'Over three months, providers canceled more web visits for minors than for adults.', viz: { type: 'stats', items: [{ v: '2,029', l: 'web visits canceled by one provider group' }, { v: '1,200', l: 'by another' }, { v: '~40%', l: 'of canceled visits, providers said, were dependent issues' }] } },
			{ k: 'What happened', t: 'I interviewed 7 providers and 7 parents.', d: 'All had canceled a visit in the past month. They described the same story.', viz: { type: 'steps', items: ['A parent logs in and connects with a provider.', 'The provider needs the child’s chart.', 'The parent thought they’d already chosen their child.', 'The provider asks them to cancel and start over.', 'The visit is canceled. Maybe they come back.'] } },
			{ k: 'Both sides', t: 'Everyone lost time.', viz: { type: 'pair', items: [{ t: 'Parents', d: ['Didn’t understand how to choose their child', 'Couldn’t switch between “accounts”', 'Talked to providers who couldn’t treat their child'] }, { t: 'Providers', d: ['Spent visits coaching the setup', 'Weren’t paid for that time', 'Weren’t sure the patient would return'] }] } },
			{ k: 'The cause', t: 'I found it on one screen.', d: 'Hick’s law, cognitive load and the laws of proximity and similarity explain why parents never changed the answer.', viz: { type: 'annot', src: '/amwell-research/dependent-care/form.webp', notes: ['“Myself” is already selected', 'It looks like every other question', 'Four decisions on one page'] } },
			{ k: 'The pattern', t: 'The next screen already worked.', d: 'It asked one thing, and people did fine. So I gave “Who is this visit for?” its own screen.', viz: { type: 'compare', before: { src: '/amwell-research/dependent-care/before.webp', cap: 'Four questions, answers pre-selected' }, after: { src: '/amwell-research/dependent-care/after.webp', cap: 'One question' } } },
			{ k: 'My proposal', t: 'Ask who the visit is for, first.', d: 'Large buttons for each person, then language that uses the child’s name from there on.', viz: { type: 'phones', screens: [{ src: '/amwell-research/dependent-care/scr-who.webp', cap: 'Who is in need of care today?' }, { src: '/amwell-research/dependent-care/scr-visit.webp', cap: 'What would they like to discuss?' }] } },
		],
		takeaways: ['I showed that parents weren’t choosing their child for the visit, and why.', 'I flagged that we defined “dependent” only as a child, not an aging parent or a sibling.', 'I turned it into one clear first question, which shipped with the service selection redesign.'],
	},
	{
		slug: 'patient-search',
		icon: '🔍',
		t: 'How patients search for care',
		method: 'Needs assessment',
		area: 'Selecting care',
		goal: 'Learn how people look for telehealth care before they ever reach us.',
		finding: '90% of patients search by insurance coverage first, usually on their insurer’s website. Asking for the insurance carrier up front was the right call.',
		changed: ['Coverage and cost shown during onboarding', 'Simpler insurance verification'],
		recs: ['Keep insurance-first search as the default', 'Add search by provider or health system for the other 10%', 'Show coverage and cost early', 'Make verifying coverage quick'],
		deck: 'How do people search for health?',
		notion: N + 'How-Patients-Search-for-Care-1276f464642d81a7a17dde011ee329b8',
		related: ['choosing-care'],
	},
	{
		slug: 'in-person-vs-amwell',
		icon: '🏥',
		t: 'In person vs. Amwell',
		method: 'Interviews and flow mapping',
		area: 'Selecting care',
		goal: 'Map an in-person doctor visit against Amwell’s service selection, step by step.',
		finding: 'In person, a receptionist or doctor guides you to the right care. Our flow made people figure it out alone.',
		changed: ['Asked “Who is this visit for?” at the start', 'Care options suggested from the reason for the visit', 'The visit reason repeated back on the next screen', 'Scheduling choices moved earlier'],
		recs: [],
		notion: N + 'Selecting-Care-In-Person-vs-Amwell-1276f464642d81ee968dd9f7b222b431',
		related: ['choosing-care', 'dependent-care'],
	},
	{
		slug: 'ai-chatbot',
		icon: '🤖',
		t: 'AI While You Wait chatbot',
		method: 'Usability study, 3 user groups',
		area: 'Conversational AI',
		goal: 'Test our waiting-room chatbot with three groups of patients to understand what they expect from it.',
		finding: 'Irrelevant questions broke trust, people wanted to answer in their own words, and many weren’t sure their answers reached the provider.',
		changed: ['Better question logic', 'Free-text answers', 'Clear messaging that answers go to the provider'],
		recs: ['Ask only questions relevant to what the patient said', 'Let people type their own answers', 'Say plainly that the provider sees the answers', 'Adapt the experience to how much each person wants to engage'],
		deck: 'AI While You Wait Chatbot',
		notion: N + 'AI-While-You-Wait-Chatbot-1276f464642d81f5af00d7018ec3f722',
		related: ['ai-covid'],
	},
	{
		slug: 'ai-covid',
		icon: '💬',
		t: 'AI While You Wait: COVID-19 script',
		method: 'Usability study',
		area: 'Conversational AI',
		goal: 'Learn how the COVID-19 version of the chatbot made patients feel while they waited.',
		finding: 'People trusted the chatbot, but slow responses, no way to edit answers, and questions they’d already answered got in the way.',
		changed: ['More waiting room content options', 'Faster responses', 'Editable answers'],
		recs: ['Offer other waiting room content, like reading or video', 'Speed up the “ground rules” step', 'Let people change an answer', 'Skip questions already answered in pre-visit forms', 'Fix the chatbot typing after it said goodbye'],
		deck: 'AIWYW COVID-19',
		notion: N + 'AI-While-You-Wait-Covid-19-Script-1276f464642d81728625c6813673ffd8',
		related: ['ai-chatbot'],
	},
	{
		slug: 'symptom-checker',
		icon: '❤️‍🩹',
		t: 'Symptom checker',
		method: 'Usability study and affinity mapping',
		area: 'Intake',
		goal: 'See how people used a chatbot-style symptom checker inside the intake flow.',
		finding: 'Its placement felt disjointed. People got lost moving between the symptom checker and the regular intake.',
		changed: ['Symptom checker removed from intake', 'A multi-page, symptom-focused intake instead'],
		recs: ['Integrate it into intake, not beside it', 'Say upfront what it’s for', 'Make moving between steps easy', 'Show progress'],
		deck: 'Symptom Checker Synthesis Review',
		notion: N + 'Symptom-Checker-1276f464642d81bcb0aef268c1ced066',
	},
	{
		slug: 'top-usability-issues',
		icon: '🔬',
		t: 'Top usability issues',
		method: 'Usability study',
		area: 'Patient app',
		goal: 'Name the top three usability issues in the white-label patient app.',
		finding: 'Confusing practice selection, errors with visits for dependents, unclear navigation, and uncertainty about phone vs. video visits.',
		changed: ['A new information architecture for choosing care', 'The phone-or-video question removed', 'No more pre-selected answers'],
		recs: ['Route people by symptom instead of a multi-step manual selection', 'Smart defaults from the patient’s profile', 'Help choosing phone or video', 'Plain labels like “Adult Urgent Care” with icons', 'One place to set up a visit for a dependent'],
		deck: 'Amwell’s Top Usability & Experience Issues',
		notion: N + 'Amwell-s-Top-Usability-Issues-1276f464642d8193b323d494a3055b8d',
		related: ['choosing-care', 'dependent-care'],
	},
	{
		slug: 'ios-onboarding',
		icon: '📱',
		t: 'iOS onboarding',
		method: 'Usability study, two rounds',
		area: 'Patient app',
		goal: 'Find the pain points in iOS patient onboarding: the sync feature, intake clarity, and entering information.',
		finding: 'The sync feature confused people, intake didn’t save, subcategories overwhelmed them, and enabling the microphone restarted intake.',
		changed: ['Sync removed', 'Only relevant subcategories shown', 'Intake auto-saves, through micro-apps and single-page apps', 'The restart after microphone setup fixed'],
		recs: [],
		deck: 'iOS App Consumer Onboarding, Usability Tests 1 and 2',
		notion: N + 'iOS-App-Consumer-Onboarding-Usability-Test-1276f464642d8176aa45cf8d6d4954c8',
		related: ['ios-enrollment'],
	},
	{
		slug: 'ios-enrollment',
		icon: '📝',
		t: 'iOS enrollment',
		method: 'Competitor analysis',
		area: 'Patient app',
		goal: 'Learn what people expect when signing up for a health app, and what the best apps do.',
		finding: 'Enrollment felt opaque and complex, so people hesitated and dropped off.',
		changed: ['A new enrollment flow, designed and tested', 'A progress stepper', 'A reason given for each question', 'The confusing “service key” field removed', 'A clearer insurance format'],
		recs: ['Three or four pages at most', 'Explain why each piece of information is needed', 'Show security and privacy, like HIPAA', 'Explain how insurance will be used'],
		deck: 'Enrollment UX Research',
		notion: N + 'Mobile-iOS-Enrollment-1276f464642d81ada5c2ecb7bc294f2d',
		related: ['ios-onboarding'],
	},
	{
		slug: 'gender-and-sex-fields',
		icon: '🚻',
		t: 'Gender and sex fields',
		method: 'Usability study',
		area: 'Provider experience',
		goal: 'Understand how providers record gender and sex for non-binary patients, and how records could do better.',
		finding: 'Providers had no standard way to document gender and sex for non-binary patients, which caused confusion.',
		changed: ['Gender and sex editable by both patient and provider', 'An explanation on each field'],
		recs: ['A clear, respectful standard for recording gender and sex', 'More gender options in the record', 'Training on gender inclusivity'],
		deck: 'Multiple Gender Options UX Research',
		notion: N + 'Multiple-Genders-vs-Biological-Sex-Fields-Non-Binary-1276f464642d810db95ae94feb576de6',
	},
	{
		slug: 'vpc-location',
		icon: '📍',
		t: 'Virtual primary care: location',
		method: 'Usability study',
		area: 'Intake',
		goal: 'Check whether patients understood why scheduling a primary care visit asked for their location.',
		finding: 'Most people expected the request and were happy to share location to be matched with local, state-licensed providers.',
		changed: ['More accurate geolocation', 'Clearer copy on why we ask'],
		recs: ['Explain that location matches you with licensed providers', 'Detect location automatically, with a way to edit it', 'Ask early, like Zocdoc and Teladoc'],
		deck: 'VPC',
		notion: N + 'VPC-Usability-Study-w-focus-on-Patient-s-Location-1276f464642d8191b52ed04f7bedafbd',
	},
	{
		slug: 'password-reset',
		icon: '🔒',
		t: 'Password reset',
		method: 'Competitor analysis',
		area: 'Accounts and forms',
		goal: 'Reduce friction and failures when resetting a password on web and mobile.',
		finding: 'No password hints, a poor mobile flow and confusing email links meant low success rates and lots of support tickets.',
		changed: ['Password requirements shown upfront', 'A move to Auth0 for accounts'],
		recs: ['Show requirements before the first attempt', 'Redesign the mobile flow', 'A one-time code or direct link instead of confusing emails', 'Warn people before they get locked out'],
		deck: 'Password Reset UXR',
		notion: N + 'Password-Reset-Flow-1276f464642d818c8094dc704bc17853',
	},
	{
		slug: 'phone-number-field',
		icon: '📞',
		t: 'Phone number field',
		method: 'Competitor analysis',
		area: 'Accounts and forms',
		goal: 'Figure out why people mistyped, and abandoned forms at, one field.',
		finding: 'People type a phone number as one string of digits and ignore formatting cues, which led to errors and abandoned forms.',
		changed: ['Country code prefilled', 'Auto-formatting as you type'],
		recs: ['Format the number as people type', 'Floating labels', 'Prefill the country code from location', 'One field, not three'],
		deck: 'Phone Number Fields Competitor Research',
		notion: N + 'Phone-Number-Field-1276f464642d8185b2d7c790453d95ba',
	},
	{
		slug: 'sound-effects',
		icon: '🔔',
		t: 'Sound effects',
		method: 'Usability study',
		area: 'Provider experience',
		goal: 'Find notification sounds that get noticed without startling providers or patients.',
		finding: 'Harsh, high-pitched sounds felt disruptive. Lower, subtler tones were preferred for all-day use.',
		changed: ['A new, lower notification sound and pitch for provider alerts'],
		recs: ['Lower-pitched sounds', 'Adjustable volume', 'Gentle repeats for critical alerts', 'Different sounds for different notifications'],
		deck: 'Sound FX Readout',
		notion: N + 'Sound-Effects-1276f464642d81d2b91fe662c9e49559',
	},
];
