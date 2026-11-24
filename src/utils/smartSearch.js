/**
 * smartSearch.js
 * Buscador inteligente compartido por la tienda:
 *  - Ignora mayúsculas, tildes y símbolos (™, ®, :, -).
 *  - Entiende abreviaciones populares: "gta" → Grand Theft Auto, "fifa" → FC, "cod" → Call of Duty…
 *  - Abreviaciones pegadas a números: "gta5", "rdr2", "re4", "fc26", "bo3".
 *  - Números romanos = números: "GTA V" se encuentra con "gta 5" y viceversa.
 *  - Tolera errores de tipeo (1–2 letras) en palabras largas.
 */

// Clave: lo que escribe la gente → cómo se llama el juego en la tienda
const ALIASES = {
  gta: ["grand theft auto"],
  gtav: ["grand theft auto 5"],
  fifa: ["fc", "ea sports fc"],
  eafc: ["fc"],
  cod: ["call of duty"],
  mw: ["modern warfare"],
  bo: ["black ops"],
  bf: ["battlefield"],
  rdr: ["red dead redemption"],
  re: ["resident evil"],
  ac: ["assassin s creed"],
  tlou: ["the last of us"],
  mk: ["mortal kombat"],
  nfs: ["need for speed"],
  gow: ["god of war"],
  fh: ["forza horizon"],
  ds: ["dark souls"],
  er: ["elden ring"],
  ff: ["final fantasy"],
  kh: ["kingdom hearts"],
  dbz: ["dragon ball"],
  db: ["dragon ball"],
  sf: ["street fighter"],
  cs: ["counter strike"],
  fnaf: ["five nights at freddy"],
  pvz: ["plants vs zombies"],
  pes: ["efootball", "pro evolution soccer"],
  ets: ["euro truck simulator"],
  ets2: ["euro truck simulator 2"],
  ats: ["american truck simulator"],
  botw: ["breath of the wild"],
  totk: ["tears of the kingdom"],
  smash: ["super smash bros"],
  spiderman: ["spider man"],
  "spider-man": ["spider man"],
  lol: ["league of legends"],
  mgs: ["metal gear solid"],
  dmc: ["devil may cry"],
  hzd: ["horizon zero dawn"],
  rdr2: ["red dead redemption 2"],
};

const ROMAN = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10", xi: "11", xii: "12", xiii: "13", xiv: "14", xv: "15", xvi: "16" };

/** minúsculas, sin tildes, sin símbolos, romanos → números */
export function normalizeSearchText(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ROMAN[t] || t)
    .join(" ");
}

/** "gta5" → "gta 5", "fc26" → "fc 26" (sin romper palabras normales) */
function splitLettersDigits(token) {
  const m = token.match(/^([a-z]{2,5})(\d{1,3})$/);
  return m ? `${m[1]} ${m[2]}` : token;
}

/** Devuelve las variantes de la búsqueda: la original + las que reemplazan abreviaciones. */
export function expandSearchQuery(query) {
  const base = normalizeSearchText(query).split(" ").map(splitLettersDigits).join(" ");
  if (!base) return [];
  const tokens = base.split(" ");
  const variants = new Set([base]);
  tokens.forEach((tok, i) => {
    const full = ALIASES[tok];
    if (!full) return;
    full.forEach((rep) => {
      const v = [...tokens.slice(0, i), rep, ...tokens.slice(i + 1)].join(" ");
      variants.add(normalizeSearchText(v));
    });
  });
  return [...variants];
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function variantMatches(variant, targetNorm, targetTokens) {
  // Coincidencia de frase desde el inicio de una palabra ("red" no debe encontrar "remastered")
  if ((" " + targetNorm).includes(" " + variant)) return true;
  const qTokens = variant.split(" ").filter(Boolean);
  return qTokens.every((q) => {
    // Números: deben coincidir exactos ("gta 5" no debe traer "gta 4")
    if (/^\d+$/.test(q)) return targetTokens.includes(q);
    if (targetTokens.some((t) => t.startsWith(q))) return true;
    if (q.length >= 4) {
      const maxDist = q.length <= 5 ? 1 : 2;
      return targetTokens.some((t) => Math.abs(t.length - q.length) <= maxDist && levenshtein(q, t) <= maxDist);
    }
    return false;
  });
}

/** true si el texto (nombre del juego) coincide con la búsqueda. */
export function smartSearchMatch(query, target) {
  const variants = expandSearchQuery(query);
  if (variants.length === 0) return true;
  const targetNorm = normalizeSearchText(target);
  if (!targetNorm) return false;
  const targetTokens = targetNorm.split(" ");
  return variants.some((v) => variantMatches(v, targetNorm, targetTokens));
}
