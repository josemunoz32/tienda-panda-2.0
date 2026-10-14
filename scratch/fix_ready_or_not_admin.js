const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.resolve(__dirname, "../pandastoreupdate-firebase-adminsdk-fbsvc-d546d74554.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixReadyOrNot() {
  const ref = db.collection("games").doc("1144200");
  const snap = await ref.get();
  if (!snap.exists) {
    console.error("Game 1144200 does not exist!");
    return;
  }
  const data = snap.data();
  console.log("Current data:", {
    app_id: data.app_id,
    name: data.name,
    lua_len: (data.lua_script || '').length
  });

  const updatePayload = {
    app_id: "1144200",
    name: "Ready or Not",
    steam_folder_name: "Ready or Not",
    lua_content: data.lua_script || data.lua_content,
    ryuu_manifest_api: "https://generator.ryuu.lol/secure_download?appid=1144200&auth_code=RYUUMANIFEST1uypp1",
    ryuu_lua_api: "https://generator.ryuu.lol/resellerlua?appid=1144200&auth_code=RYUUMANIFEST1uypp1",
    is_base_game: true,
    technical_category: "solo_lua"
  };

  await ref.update(updatePayload);
  console.log("Updated games/1144200 successfully via firebase-admin!");
}

fixReadyOrNot().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
