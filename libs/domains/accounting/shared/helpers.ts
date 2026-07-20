export function cleanName(name: string | null): string {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim()
    .toLowerCase();
}
