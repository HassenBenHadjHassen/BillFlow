import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import db from "@/lib/db";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { UserSession } from "@/types";

const SESSION_COOKIE_NAME = "billflow_session";
const SESSION_DURATION_DAYS = 30;

function getAuthSecret(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "bf_sec_8f912a7d4300a4023c914b1820b41058ad9124be3f2a58";
  return new TextEncoder().encode(secret);
}

// Better Auth instance - 100% in-project SQLite, zero external services
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * SESSION_DURATION_DAYS,
    updateAge: 60 * 60 * 24,
  },
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "bf_sec_8f912a7d4300a4023c914b1820b41058ad9124be3f2a58",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: UserSession): Promise<string> {
  const secret = getAuthSecret();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const secret = getAuthSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("better-auth.session_token");
}

export async function getSession(): Promise<UserSession | null> {
  // 1. Try Better Auth session from headers
  try {
    const reqHeaders = await headers();
    const betterSession = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (betterSession && betterSession.user) {
      return {
        id: betterSession.user.id,
        name: betterSession.user.name,
        email: betterSession.user.email,
      };
    }
  } catch {
    // Fall back to token cookie
  }

  // 2. Try persistent signed session cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      return await verifySessionToken(token);
    }
  } catch {
    return null;
  }

  return null;
}

export async function requireAuth(): Promise<UserSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in to continue");
  }
  return session;
}
