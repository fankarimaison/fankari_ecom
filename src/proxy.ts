import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Clerk session handling for every request. Routes are not blocked here —
 * API handlers decide access themselves via getSessionUser().
 */
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
