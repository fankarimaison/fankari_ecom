import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

/** Cookie name used for the session JWT. */
export const SESSION_COOKIE = 'session'

/** Session lifetime: 7 days, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD = 75

/** Flat shipping fee applied below the free-shipping threshold. */
export const FLAT_SHIPPING = 6.99

export interface SessionPayload {
  userId: string
  email: string
  role: string
}

export interface SessionUser {
  id: string
  email: string
  role: string
}

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    'terra-and-thread-dev-secret-change-me-in-production'
  return new TextEncoder().encode(secret)
}

/** Sign a session JWT (HS256, 7 day expiry). */
export function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

/** Attach the httpOnly session cookie to a response. */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return response
}

/** Clear the session cookie (logout). */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

/**
 * Read + verify the session from the `session` cookie.
 * Works in route handlers / server code. Returns null when missing or invalid.
 */
export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  try {
    const token =
      req?.cookies.get(SESSION_COOKIE)?.value ??
      (await cookies()).get(SESSION_COOKIE)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())
    const userId = payload.userId
    if (typeof userId !== 'string' || !userId) return null

    return {
      id: userId,
      email: typeof payload.email === 'string' ? payload.email : '',
      role: typeof payload.role === 'string' ? payload.role : 'CUSTOMER',
    }
  } catch {
    return null
  }
}

/**
 * Guard helper for route handlers. Returns the session user, or null so the
 * handler can respond, e.g.:
 *   const user = await requireUser()
 *   if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
 */
export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser()
}
