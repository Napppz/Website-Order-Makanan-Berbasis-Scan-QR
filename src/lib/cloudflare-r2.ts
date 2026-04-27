import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} belum diatur.`);
  }

  return value;
}

function getPublicBaseUrl() {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!publicUrl) {
    throw new Error("Environment variable CLOUDFLARE_R2_PUBLIC_URL belum diatur.");
  }

  return publicUrl.replace(/\/+$/, "");
}

function getR2Client() {
  if (!r2Client) {
    const accountId = getRequiredEnv("CLOUDFLARE_R2_ACCOUNT_ID");

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: getRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  return r2Client;
}

function getBucketName() {
  return getRequiredEnv("CLOUDFLARE_R2_BUCKET_NAME");
}

export async function uploadBufferToR2({
  buffer,
  contentType,
  keyPrefix,
  fileName,
}: {
  buffer: Buffer;
  contentType: string;
  keyPrefix: string;
  fileName: string;
}) {
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase() ?? "bin"
    : "bin";
  const safePrefix = keyPrefix.replace(/^\/+|\/+$/g, "");
  const objectKey = `${safePrefix}/${Date.now()}-${randomUUID()}.${extension}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${getPublicBaseUrl()}/${objectKey}`;
}

export async function deleteR2ObjectByUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return;
  }

  const publicBaseUrl = getPublicBaseUrl();

  if (!fileUrl.startsWith(publicBaseUrl)) {
    return;
  }

  const objectKey = fileUrl.slice(publicBaseUrl.length + 1);
  if (!objectKey) {
    return;
  }

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
    }),
  );
}
