export type Beat = {
	title: string;
	text: string;
	quote?: [string, string];
	metric?: { to?: number; prefix?: string; suffix?: string; text?: string; unit: string };
	media?: { kind: 'clip' | 'slice' | 'image'; src: string; poster?: string; start?: number; end?: number; alt: string };
	viz?: 'empty' | 'users';
	links?: { href: string; label: string }[];
};
export interface ScrollProps {
	toolsScene?: { after: string; tools: import('./tools').Tool[]; title: string; lede?: string };
	title: string;
	description: string;
	eyebrow: string;
	heroTitle: string;
	lede: string;
	tools?: string;
	hero: { src: string; poster?: string };
	scenes: { id: string; label: string; nav: string; beats: Beat[] }[];
	endTitle: string;
	endText: string;
	endLinks?: { href: string; label: string; ghost?: boolean }[];
}
