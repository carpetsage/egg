/**
 * EID hashing and request validation.
 *
 * Privacy is not a primary concern for this service — the EID hash is used
 * only to partition storage so each player's plans are grouped together.
 * The raw EID is never stored; only the 16-char hex prefix of its SHA-256 is
 * used as a key prefix.
 */

/**
 * Compute the 16-char hex prefix of the SHA-256 of a lowercased EID.
 * Matches the client-side cloudEidHash() in src/lib/storage/db.ts.
 */
export async function hashEid(eid: string): Promise<string> {
  const encoded = new TextEncoder().encode(eid.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

/**
 * Validate that the X-EID header's hash matches the eidHash URL parameter.
 * Returns the validated eidHash string, or null if validation fails.
 *
 * This is a consistency check, not a security gate. It prevents accidentally
 * writing to the wrong partition if a client sends mismatched values.
 */
export async function validateEidHash(
  request: Request,
  expectedHash: string
): Promise<boolean> {
  const eid = request.headers.get('X-EID');
  if (!eid) return false;
  const computed = await hashEid(eid);
  return computed === expectedHash;
}
