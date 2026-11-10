// Photos from the team. Add a `caption` to any item to show a short label under it.
export interface Highlight {
	src: string;
	alt: string;
	caption?: string;
	rot: number; // degrees of tilt
	y: number; // vertical offset in rem, for the scattered look
	w: number; // card width in rem
}

export const highlights: Highlight[] = [
	{ src: '/team/present.webp', caption: 'Presenting “From siloed UIs to one DDE shell”', alt: 'Casey presenting a slide titled “From siloed UIs to one DDE shell” on a screen', rot: -3, y: 0, w: 19 },
	{ src: '/team/game.webp', caption: 'Design team night at the ballgame', alt: 'Six teammates squeezed into a selfie at a baseball game', rot: 2.5, y: 2.5, w: 15 },
	{ src: '/team/mirror.webp', caption: 'Team selfie, elevator edition', alt: 'A group selfie in an elevator mirror', rot: -2, y: 0.5, w: 15 },
	{ src: '/team/egypt.webp', caption: 'Rooftop in Cairo', alt: 'Two teammates in headscarves on a rooftop overlooking Cairo', rot: 3, y: 2, w: 20 },
	{ src: '/team/dinner.webp', caption: 'Team dinner', alt: 'The team around a long candlelit dinner table', rot: -2.5, y: 0, w: 15 },
	{ src: '/team/lobby.webp', caption: 'Offsite crew', alt: 'Five teammates posing in a hotel lobby', rot: 2, y: 2.5, w: 14 },
	{ src: '/team/pizza.webp', caption: 'Pizza break', alt: 'Two teammates over slices at a pizza shop', rot: -3, y: 0.5, w: 15 },
];
