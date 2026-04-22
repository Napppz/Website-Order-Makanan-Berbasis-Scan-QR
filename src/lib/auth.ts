import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";

import { getPrisma } from "@/lib/prisma";

const COOKIE_NAME = "cashier_session";

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "dev-secret-yang-harus-diganti",
  );
}

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireCashier() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cashier = await getPrisma().cashierUser.findUnique({
    where: { id: session.userId },
  });

  if (!cashier) {
    redirect("/login");
  }

  return cashier;
}
