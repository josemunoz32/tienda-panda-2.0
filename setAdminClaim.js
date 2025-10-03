const admin = require("firebase-admin");
const serviceAccount = require("./pandastoreupdate-firebase-adminsdk-fbsvc-d546d74554.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const uid = "lrtGo7tzVeeaDiRpDJnoqXeJEC03"; // UID del usuario admin

admin.auth().setCustomUserClaims(uid, { role: "admin" })
  .then(() => {
    console.log("Custom claim 'role: admin' set for user:", uid);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error al asignar claim:", error);
    process.exit(1);
  });