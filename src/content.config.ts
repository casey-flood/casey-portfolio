import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		outcome: z.string(),
		summary: z.string(),
		metrics: z
			.array(
				z.object({
					value: z.string(),
					label: z.string(),
				}),
			)
			.default([]),
		prototypeUrl: z.string().url().optional(),
		tags: z.array(z.string()).default([]),
		featured: z.boolean().default(false),
		status: z.enum(['published', 'coming-soon']).default('published'),
		order: z.number(),
		role: z.string().optional(),
		timeline: z.string().optional(),
		industry: z.string().optional(),
		// Card color on home/work pages: coral | sun | mint | sky | lilac
		accent: z.enum(['coral', 'sun', 'mint', 'sky', 'lilac']).default('sun'),
		// true = has its own hand-built page in src/pages/work/<id>.astro
		custom: z.boolean().default(false),
	}),
});

export const collections = { projects };
