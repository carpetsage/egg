/**
 * @module compress
 * @description Client-side gzip compression / decompression using the
 * built-in browser CompressionStream / DecompressionStream APIs.
 *
 * Used to reduce plan payload size before uploading to cloud storage.
 * Typical plan JSON (~200-400 KB) compresses to ~30-60 KB.
 */

/**
 * Compress a string to a gzip ArrayBuffer.
 */
export async function compress(data: string): Promise<ArrayBuffer> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

/**
 * Decompress a gzip ArrayBuffer back to a string.
 */
export async function decompress(data: ArrayBuffer): Promise<string> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
