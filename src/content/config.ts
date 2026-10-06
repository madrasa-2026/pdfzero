import { defineCollection, z } from 'astro:content';

const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    shortDescription: z.string(),
    description: z.string(),
    category: z.enum(['organize', 'optimize', 'security', 'convert']),
    icon: z.string(),
    order: z.number().default(100),
    isFlagship: z.boolean().default(false),
    popular: z.boolean().default(false),
    disclaimer: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    howToSteps: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ),
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    relatedTools: z.array(z.string()).default([]),
  }),
});

export const collections = {
  tools: toolsCollection,
};
