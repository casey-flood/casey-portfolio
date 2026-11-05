// Swap images here only. One entry per stage.
// Use a 4:3 image. Put files in /public/scan-to-smile/ and set `src`.
// Leave `src` undefined to show the labeled placeholder.
// `credit` and `cleared` are for your own tracking; set cleared to true once the image is approved to publish.

export interface StageImage {
	src?: string;
	alt: string;
	label: string; // placeholder title
	hint: string; // what to put here
	credit?: string;
	cleared?: boolean;
}

export const stageImages: Record<number, StageImage> = {
	1: { alt: 'A dentist talking with a patient in the chair', label: 'Patient and dentist', hint: 'Patient in the chair, dentist explaining' },
	2: { alt: 'A dentist scanning a patient’s teeth with an intraoral scanner', label: 'Intraoral scan', hint: 'Dentist scanning, or the Dandy Vision scanner' },
	3: { alt: 'The Chairside order screen', label: 'Chairside order', hint: 'Dandy Chairside order screen (real, approved)' },
	4: { alt: 'A dental designer working on a 3D crown', label: 'Designer in DDE', hint: 'Designer working on a crown (real, approved)' },
	5: { alt: 'A milling machine shaping a crown', label: 'Manufacturing', hint: 'Milling close-up or Dandy’s warehouse (verified)' },
	6: { alt: 'A dentist holding a finished crown', label: 'Fit and place', hint: 'Dentist fitting the finished crown' },
};
