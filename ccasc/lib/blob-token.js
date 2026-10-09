/**
 * Vercel injects `BLOB_READ_WRITE_TOKEN`, or `{PREFIX}_READ_WRITE_TOKEN` when a
 * custom prefix was configured on the Blob store connection, so resolve either.
 */
export function resolveBlobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }
  const key = Object.keys(process.env).find((name) =>
    name.endsWith("_READ_WRITE_TOKEN")
  );
  return key ? process.env[key] : null;
}
