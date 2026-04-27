import { headers } from "next/headers";

type RateLimitPolicy = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return { url, token };
}

function sanitizePart(value: string) {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9:_-]/g, "_").slice(0, 80);
  return sanitized || "na";
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value && typeof value === "object" && "result" in value) {
    return toNumber((value as { result: unknown }).result);
  }

  return null;
}

async function runPipeline(commands: Array<Array<string | number>>) {
  const { url, token } = getUpstashConfig();
  if (!url || !token) {
    return null;
  }

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Upstash pipeline gagal: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result: unknown }).result;
    if (Array.isArray(result)) {
      return result;
    }
  }

  throw new Error("Respons Upstash pipeline tidak dikenali.");
}

export async function getRateLimitClientIp() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

export async function enforceRateLimit(
  policy: RateLimitPolicy,
  identityParts: string[],
): Promise<RateLimitResult> {
  const safeIdentity = identityParts.map(sanitizePart).join(":");
  const key = `${sanitizePart(policy.keyPrefix)}:${safeIdentity}`;

  try {
    const pipelineResult = await runPipeline([
      ["INCR", key],
      ["EXPIRE", key, policy.windowSeconds, "NX"],
      ["TTL", key],
    ]);

    if (!pipelineResult) {
      // Fail-open when Redis is not configured to avoid runtime outage.
      return {
        ok: true,
        retryAfterSeconds: 0,
        remaining: policy.limit,
      };
    }

    const count = toNumber(pipelineResult[0]);
    const ttl = toNumber(pipelineResult[2]) ?? policy.windowSeconds;
    if (count === null) {
      throw new Error("Nilai count rate limit tidak valid.");
    }

    const remaining = Math.max(0, policy.limit - count);
    if (count > policy.limit) {
      return {
        ok: false,
        retryAfterSeconds: ttl > 0 ? ttl : policy.windowSeconds,
        remaining: 0,
      };
    }

    return {
      ok: true,
      retryAfterSeconds: 0,
      remaining,
    };
  } catch (error) {
    console.error("Rate limiter mengalami masalah, fallback fail-open.", error);
    return {
      ok: true,
      retryAfterSeconds: 0,
      remaining: policy.limit,
    };
  }
}
