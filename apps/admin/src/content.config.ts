import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const helpCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/help" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Une catégorie par domaine du menu d'administration : le centre d'aide se lit
    // dans le même ordre que l'application.
    category: z.enum(['adherents', 'interclubs', 'comptabilite', 'boutique', 'communication', 'site', 'admin']),
    order: z.number().default(99),
  }),
});

export const collections = {
  'help': helpCollection,
};
