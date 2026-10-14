import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const apiKey = envVars.REACT_APP_FIREBASE_API_KEY;
const projectId = envVars.REACT_APP_FIREBASE_PROJECT_ID;

const docPathName = `projects/${projectId}/databases/(default)/documents/licenses/PANDA-JV2M-KW6U`;

async function testLastSeen() {
  const patchUrl = `https://firestore.googleapis.com/v1/${docPathName}?updateMask.fieldPaths=last_seen&key=${apiKey}`;
  const body = {
    fields: {
      last_seen: { stringValue: "2026-09-30 18:09:00" }
    }
  };

  const res = await fetch(patchUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  console.log("Status:", res.status, res.statusText);
  console.log("Response body:", text);
}

testLastSeen();
