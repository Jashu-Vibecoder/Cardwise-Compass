import type { Category } from './types';

export function findCategoryAskedAbout(question: string, categories: Pick<Category, 'id' | 'slug' | 'name'>[]) {
  const phrase = question.toLocaleLowerCase().match(/\bon\s+(.+?)(?:[?!.,]|$)/u)?.[1]?.trim();
  if (!phrase) return undefined;
  const normalized = phrase.replace(/\s+/g, ' ');
  return categories.find((category) => category.slug.toLocaleLowerCase() === normalized
    || category.name.toLocaleLowerCase() === normalized);
}
