export type Beat = {
	title: string;
	text: string;
	quote?: [string, string];
	metric?: { to?: number; prefix?: string; suffix?: string; text?: string; unit: string };
	media?: { kind: 'clip' | 'slice' | 'image'; src: string; poster?: string; start?: number; end?: number; alt: string };
	viz?: 'empty' | 'users';
	html?: string;
	cards?: { items: { src: string; alt: string; who: string; label: string }[]; on: number };
	links?: { href: string; label: string }[];
};
export interface ScrollProps {
	short?: { title: string; rows: { k: string; v: string }[]; img?: { src: string; alt: string }; compare?: { before: { mp4: string; poster: string; label: string; alt: string }; after: { mp4: string; poster: string; label: string; alt: string }; ratio?: string; label?: string }; stats?: { v: string; l: string; s?: string }[]; src?: string; more?: { href: string; label: string } };
	toolsScene?: { after: string; tools: import('./tools').Tool[]; title: string; lede?: string };
	title: string;
	description: string;
	eyebrow: string;
	heroTitle: string;
	lede: string;
	tools?: string;
	hero: { src: string; poster?: string; image?: boolean; alt?: string };
	brand?: { logo: string; alt: string; backHref: string; backLabel: string; cls?: string };
	scenes: { id: string; label: string; nav: string; beats: Beat[] }[];
	endTitle: string;
	endText: string;
	endLinks?: { href: string; label: string; ghost?: boolean }[];
}
