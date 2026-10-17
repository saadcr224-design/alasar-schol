// Next.js may construct req.url with an internal hostname. Validate the browser
// Origin against the public Host header instead. Forwarded protocol is set by
// the hosting proxy; never use a client-provided forwarded host as authority.
export function isSameOrigin(req: Request) {
  const value = req.headers.get('origin'), host = req.headers.get('host');
  if (!value || !host) return false;
  try {
    const origin = new URL(value);
    const protocol = req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.slice(0, -1);
    return (protocol === 'http' || protocol === 'https') && value === origin.origin
      && origin.protocol === protocol + ':' && origin.host === host.toLowerCase();
  } catch { return false; }
}
