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

// Document path: projects/{projectId}/databases/(default)/documents/licenses/{docId}
// Let's test on PANDA-JV2M-KW6U
const docPathName = `projects/${projectId}/databases/(default)/documents/licenses/PANDA-JV2M-KW6U`;

async function testPatch() {
  const patchUrl = `https://firestore.googleapis.com/v1/${docPathName}?updateMask.fieldPaths=hwid&key=${apiKey}`;
  const testHwid = "TEST_HWID_1234567890ABCDEF";
  const body = {
    fields: {
      hwid: { stringValue: testHwid }
    }
  };

  console.log("Sending PATCH to:", patchUrl);
  const res = await fetch(patchUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  console.log("Status:", res.status, res.statusText);
  console.log("Response body:", text);
}

testPatch();
