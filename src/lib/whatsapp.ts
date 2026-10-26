/**
 * Orders are confirmed over WhatsApp: after checkout the buyer opens a
 * wa.me link to the seller's number (Admin → Content → whatsappNumber) with
 * the order details pre-filled, and sends it from their own WhatsApp. The
 * message itself is built in src/components/store/whatsapp-order.ts.
 */

/** Digits only, as wa.me expects (country code, no +, spaces or dashes). */
export function normalizeWhatsAppNumber(raw: string | undefined): string {
  return (raw ?? '').replace(/\D/g, '')
}

/** A plausible international number: 8–15 digits (E.164 without the +). */
export function isWhatsAppNumber(digits: string): boolean {
  return /^\d{8,15}$/.test(digits)
}
