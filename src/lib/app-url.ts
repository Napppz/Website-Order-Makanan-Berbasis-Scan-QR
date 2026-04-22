import { headers } from "next/headers";

function normalizeUrl(rawUrl: string) {
  return rawUrl.replace(/\/+$/, "");
}

export async function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configuredUrl) {
    const urlWithProtocol = configuredUrl.startsWith("http")
      ? configuredUrl
      : `https://${configuredUrl}`;

    return normalizeUrl(urlWithProtocol);
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (host) {
    return normalizeUrl(`${protocol}://${host}`);
  }

  return "http://localhost:3000";
}
