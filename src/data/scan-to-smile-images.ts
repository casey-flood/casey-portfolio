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
	1: { src: '/scan-to-smile/01-patient.webp', alt: 'A patient in the dental chair talking with their dentist', label: 'Patient and dentist', hint: 'Patient in the chair, dentist explaining' },
	2: { src: '/scan-to-smile/02-scan.webp', alt: 'A dentist scanning a patient\u2019s teeth with an intraoral scanner', label: 'Intraoral scan', hint: 'Dentist scanning, or the Dandy Vision scanner' },
	3: { src: '/scan-to-smile/03-order.webp', alt: 'The Dandy Chairside order screen', label: 'Chairside order', hint: 'Dandy Chairside order screen (real, approved)' },
	4: { src: '/scan-to-smile/04-design.webp', alt: 'A dental designer reviewing a 3D crown design on screen', label: 'Designer in DDE', hint: 'Designer working on a crown (real, approved)' },
	5: { src: '/scan-to-smile/05-make.webp', alt: 'A milling machine shaping a crown', label: 'Manufacturing', hint: 'Milling close-up or Dandy’s warehouse (verified)' },
	6: { src: '/scan-to-smile/06-place.webp', alt: 'A dentist holding a finished crown beside the patient\u2019s mouth', label: 'Fit and place', hint: 'Dentist fitting the finished crown' },
};
