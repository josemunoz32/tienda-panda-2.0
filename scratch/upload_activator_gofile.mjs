import fs from "fs";
import path from "path";
import https from "https";

async function getBestServer() {
  return new Promise((resolve, reject) => {
    https.get("https://api.gofile.io/servers", (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.status === "ok" && json.data?.servers?.length > 0) {
            resolve(json.data.servers[0].name);
          } else {
            resolve("store1");
          }
        } catch {
          resolve("store1");
        }
      });
    }).on("error", () => resolve("store1"));
  });
}

async function uploadFile(filePath) {
  const server = await getBestServer();
  console.log(`Subiendo a servidor GoFile: ${server}...`);

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const fileName = path.basename(filePath);
  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const totalLength = header.length + fileSize + footer.length;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: `${server}.gofile.io`,
      port: 443,
      path: "/contents/uploadfile",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": totalLength,
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.status === "ok") {
            resolve(json.data.downloadPage);
          } else {
            reject(new Error(json.message || "Error al subir"));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(header);
    fileStream.pipe(req, { end: false });
    fileStream.on("end", () => {
      req.end(footer);
    });
  });
}

const exePath = "c:\\Users\\Usuario\\proyectopandastore20\\public\\PandaStoreActivator.exe";
uploadFile(exePath).then(link => {
  console.log("LINK GOFILE:", link);
  fs.writeFileSync("c:\\Users\\Usuario\\proyectopandastore20\\scratch\\activator_gofile.json", JSON.stringify({ url: link }, null, 2));
}).catch(err => {
  console.error("Error:", err.message);
});
