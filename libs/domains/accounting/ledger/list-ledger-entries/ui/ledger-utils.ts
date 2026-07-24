export function getPageRange(current: number, total: number) {
  if (total <= 0) return [];
  if (total === 1) return [1];

  const delta = 2;
  const pages = new Set<number>();

  pages.add(1);
  pages.add(total);

  const start = Math.max(1, current - delta);
  const end = Math.min(total, current + delta);
  for (let i = start; i <= end; i++) {
    pages.add(i);
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const range: (number | string)[] = [];
  for (let i = 0; i < sortedPages.length; i++) {
    if (i > 0) {
      const prev = sortedPages[i - 1];
      const curr = sortedPages[i];
      const gap = curr - prev;
      if (gap === 2) {
        range.push(prev + 1);
      } else if (gap > 2) {
        range.push('...');
      }
    }
    range.push(sortedPages[i]);
  }

  return range;
}
