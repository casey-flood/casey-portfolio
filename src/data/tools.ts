// Tools used at Dandy. Add more here; `hub: true` also shows it on the Product Design Hub page.
// Logos: drop an official logo into /public/tools/<slug>.svg (or .png/.webp) and it replaces the name.
export interface Tool { slug: string; name: string; desc: string; hub?: boolean }

export const tools: Tool[] = [
	{ slug: 'cursor', desc: 'The AI code editor where I build prototypes and the design system.', name: 'Cursor', hub: true },
	{ slug: 'storybook', desc: 'Where the design system and my prototypes live, on production code.', name: 'Storybook', hub: true },
	{ slug: 'screen-studio', desc: 'Screen recordings, like the walkthroughs in the Cursor e-learning.', name: 'Screen Studio', hub: true },
	{ slug: 'github', desc: 'Where the code lives, including the branches for my prototypes.', name: 'GitHub', hub: true },
	{ slug: 'terminal', desc: 'Running the project locally and pulling down the repos.', name: 'Terminal', hub: true },
];
