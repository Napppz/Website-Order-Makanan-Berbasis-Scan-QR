import fs from "node:fs";
import path from "node:path";

const requiredEnv = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SESSION_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "MIDTRANS_MERCHANT_ID",
  "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY",
  "MIDTRANS_SERVER_KEY",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET_NAME",
  "CLOUDFLARE_R2_PUBLIC_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env.production"));
loadEnvFile(path.join(projectRoot, ".env.production.local"));

function isMissing(value) {
  return !value || !String(value).trim();
}

const missing = requiredEnv.filter((name) => isMissing(process.env[name]));

if (missing.length > 0) {
  console.error("Verifikasi environment gagal. Variabel berikut wajib diisi:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  console.error(
    "Isi environment di Vercel Project Settings atau file .env sebelum menjalankan build production.",
  );
  process.exit(1);
}

console.log("Verifikasi environment berhasil.");
