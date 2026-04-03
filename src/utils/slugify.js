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

export const catUrl  = (name, id) => `/categoria/${slugify(name)}--${id}`;
export const prodUrl = (name, id) => `/producto/${slugify(name)}--${id}`;
export const extractId = (param) =>
  param && param.includes('--') ? param.split('--').pop() : param;
