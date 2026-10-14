import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\611a31c1-38af-47e7-93a9-dd6a77c87663\\.system_generated\\steps\\288\\content.md', 'utf8');

console.log("Analyzing content.md from lua.tools/fixes...");

// 1. Look for AppIDs and game names in Next.js hydration payload or HTML elements
const gameMap = new Map(); // appid -> name or name -> appid

// Match pattern: appid, name, etc.
// In Next.js pages, data is often embedded in JSON scripts or data arrays
const jsonChunkMatch = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
if (jsonChunkMatch) {
  try {
    const data = JSON.parse(jsonChunkMatch[1]);
    console.log("Found __NEXT_DATA__ payload!", Object.keys(data));
  } catch(e) {
    console.log("Error parsing __NEXT_DATA__:", e.message);
  }
}

// Alternative: Extract all appids and titles from HTML or API responses embedded in page
// Look for appid links or image sources like header.jpg
const appidImgRegex = /cdn\.akamai\.steamstatic\.com\/steam\/apps\/(\d+)\/header\.jpg/g;
const appids = new Set();
let m;
while ((m = appidImgRegex.exec(content)) !== null) {
  appids.add(m[1]);
}
console.log("AppIDs extracted from Steam CDN URLs:", appids.size);

// Look for game names in HTML text or json properties
const nameRegex = /"name":"([^"]+)"/g;
const names = new Set();
while ((m = nameRegex.exec(content)) !== null) {
  const n = m[1];
  if (n && n.length >= 2 && !n.includes('Lua') && !n.includes('Fix') && !n.includes('Steam') && !n.includes('Next')) {
    names.add(n);
  }
}
console.log("Names extracted:", names.size);
console.log("Sample names:", Array.from(names).slice(0, 30));
