import fetch from 'node-fetch';

const authCode = "RYUUMANIFEST1uypp1";
const appId = "3764200";

const testUrls = [
  `https://generator.ryuu.lol/fixes?appid=${appId}&auth_code=${authCode}`,
  `https://generator.ryuu.lol/get_fixes?appid=${appId}&auth_code=${authCode}`,
  `https://generator.ryuu.lol/api/fixes?appid=${appId}&auth_code=${authCode}`,
  `https://generator.ryuu.lol/files/fixes.json`,
  `https://generator.ryuu.lol/files/games.json`,
  `https://generator.ryuu.lol/game_fixes?appid=${appId}&auth_code=${authCode}`,
  `https://generator.ryuu.lol/list_fixes?appid=${appId}&auth_code=${authCode}`,
  `https://generator.ryuu.lol/download_fix?appid=${appId}&auth_code=${authCode}`,
  `https://generator.ryuu.lol/download_fix?id=1&auth_code=${authCode}`
];

for (const url of testUrls) {
  try {
    console.log(`\nTesting: ${url}`);
    const res = await fetch(url, { headers: { 'User-Agent': 'PandaStoreLauncher/2.4' } });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const contentType = res.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    if (res.ok) {
      const text = await res.text();
      console.log(`Response length: ${text.length}`);
      console.log(`Sample: ${text.substring(0, 500)}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}
