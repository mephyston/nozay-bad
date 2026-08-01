import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const helpCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/help" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(['adherents', 'comptabilite', 'boutique', 'admin']),
    order: z.number().default(99),
  }),
});

export const collections = {
  'help': helpCollection,
};
