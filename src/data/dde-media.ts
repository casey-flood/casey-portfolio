// Drop real media into /public/work/dde/ and point a beat at it here. A beat with no entry shows its
// built-in animated illustration. Videos play only while their beat is on screen (muted, looping).
//
// Beat ids: handoff, scatter, survey, usage, miles, leads, shadow, reviews, competitors, finding,
//           system, stages, sliders, prep, frontview, crown, autoprep
// Research beats show their metric on top of the photo, so photos work best with a darker area bottom-left.
export interface Media {
	type: 'image' | 'video' | 'gallery';
	src: string; // for a gallery, the first image; list all three in `srcs`
	srcs?: string[];
	poster?: string;
	alt: string;
	fit?: 'contain'; // screenshots: show the whole image, metric card goes underneath
}

export const ddeMedia: Record<string, Media> = {
	// Cairo: the office floor, the team on the visit, and Giza. Cross-fades through three photos.
	miles: { type: 'gallery', src: '/work/dde/office-wide.webp', srcs: ['/work/dde/office-wide.webp', '/work/dde/cairo-team.webp', '/work/dde/cairo-giza.webp'], alt: 'The design lab in Cairo, and the team on my first visit' },
	leads: { type: 'image', src: '/work/dde/leads-room.webp', alt: 'In a review session with the Cairo team, a 3D case on screen' },
	reviews: { type: 'video', src: '/work/dde/design-review.mp4', poster: '/work/dde/design-review.jpg', alt: 'Leading a weekly design walkthrough with engineers, the PM, and dental designers' },
	shadow: { type: 'image', src: '/work/dde/office-desks.webp', alt: 'Designers at work on the Design Editor in the Cairo lab' },
	// Cairo: the office floor, the team on the visit, and Giza. Cross-fades through three photos.
	miles: { type: 'gallery', src: '/work/dde/office-wide.webp', srcs: ['/work/dde/office-wide.webp', '/work/dde/cairo-team.webp', '/work/dde/cairo-giza.webp'], alt: 'The design lab in Cairo, and the team on my first visit' },
	leads: { type: 'image', src: '/work/dde/leads-room.webp', alt: 'In a review session with the Cairo team, a 3D case on screen' },
	shadow: { type: 'image', src: '/work/dde/office-desks.webp', alt: 'Designers at work on the Design Editor in the Cairo lab' },
	// Existing clip of the design system being built in Storybook.
	system: {
		type: 'video',
		src: '/journey/storybook-ds-preview.mp4',
		poster: '/journey/storybook-ds-cover.jpg',
		alt: 'Building the Design Editor design system in Storybook',
	},
	competitors: { type: 'gallery', fit: 'contain', src: '/work/dde/3shape-notes.webp', srcs: ['/work/dde/3shape-notes.webp', '/work/dde/sentry-dashboard.webp'], alt: 'My UI audit notes on 3Shape, and a Sentry dashboard of Design Editor errors' },
	finding: { type: 'video', src: '/work/dde/figjam.mp4', poster: '/work/dde/figjam.jpg', alt: 'My FigJam board of designer interviews, shadow sessions and workshop notes' },
	// Examples to fill in:
	// competitors: { type: 'image', src: '/work/dde/sentry.png', alt: 'Sentry dashboard' },
	// prep: { type: 'video', src: '/work/dde/prep.mp4', poster: '/work/dde/prep.jpg', alt: 'Choosing the base tooth in prep' },
	// crown: { type: 'video', src: '/work/dde/crown.mp4', alt: 'A generated crown appearing for the designer' },
};
