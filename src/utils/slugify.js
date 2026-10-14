export function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const catUrl  = (name, id) => `/categoria/${slugify(name)}`;
// Conserva un slug legible y un identificador estable: evita colisiones y permite
// que el servidor genere metadata SEO del producto exacto.
export const prodUrl = (name, id) => `/producto/${slugify(name)}${id ? `--${id}` : ""}`;
export const extractId = (param) =>
  param && param.includes('--') ? param.split('--').pop() : param;
