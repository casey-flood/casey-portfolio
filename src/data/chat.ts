// Set to your deployed worker URL (see /worker/README.md). Leave empty to use the built-in offline answers.
export const CHAT_ENDPOINT = '';

export const starters = [
	'What did you build at Dandy?',
	'How do you design in code?',
	'Tell me about the Amwell work',
	'What is your story?',
];

// Offline answers used until the AI worker is connected. Links use [[Label|/path]].
export const offline: { match: RegExp; reply: string }[] = [
	{ match: /design system|storybook|floss|component/i, reply: "Dandy Design Center had no design system, so I built one from scratch in Storybook with Cursor, on production code. Iteration went from 30–45 minutes to 5–10. [[Read the case study|/work/dandy-design-system]]" },
	{ match: /prototype|clickable/i, reply: "With real components I can build full, clickable flows in Storybook instead of static frames. [[See how|/work/dandy-prototype]]" },
	{ match: /teach|hub|onboard|jam/i, reply: "I turned a personal workflow into a team practice: onboarding, design jams, and the Product Design Hub. [[Read more|/work/dandy-product-design-hub]]" },
	{ match: /dandy|design editor|dental|teeth/i, reply: "At Dandy I'm the sole designer on the Design Editor, essentially Figma for teeth, where lab designers prep scans and design restorations. [[My Dandy story|/journey#dandy]] · [[Design system|/work/dandy-design-system]]" },
	{ match: /amwell|telehealth|urgent care|admin/i, reply: "Five years at Amwell, from UX Designer to Senior Product Designer. I redesigned the admin platform and task completion went from 45% to 82%. [[Case study|/work/amwell]]" },
	{ match: /my trips|mytrips|pratt|travel/i, reply: "My Trips was my Pratt capstone: an itinerary tool for spontaneous travelers. Testing showed 94% less time to share a trip. [[Case study|/work/mytrips]]" },
	{ match: /paper airplane|first job|dating/i, reply: "Paper Airplane was my first design job: brand, guerrilla marketing, research, UI, and APIs at an early-stage dating app. [[Case study|/work/paper-airplane]]" },
	{ match: /story|background|origin|how did you|grew|where.*from/i, reply: "From drawing as a kid to JMU, Paper Airplane, Pratt, Amwell, and now Dandy. It reads best newest-first. [[Take the scroll|/journey]]" },
	{ match: /ai|cursor|claude|code|engineer/i, reply: "I design in code: a design system in Storybook, prototypes in Claude Design and Claude Code, so what we test is what ships. [[How I work|/#how]]" },
	{ match: /contact|hire|email|hi\b|hello|reach/i, reply: "Say hi at caseylflood@gmail.com. Fast replies, mild puns." },
];
export const fallback = "Good question, and I'm still in offline mode so I only know the highlights. Try asking about Dandy, Amwell, the design system, or my story, or email caseylflood@gmail.com.";
