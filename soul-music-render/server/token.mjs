// Opaque, URL-safe stream token carried by the browser. It only contains
// metadata the server needs to resolve a playable stream.
export function makeToken(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeToken(token) {
  try {
    const raw = Buffer.from(String(token), 'base64url').toString('utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      title: String(data.t || ''),
      artist: String(data.a || ''),
      source: String(data.s || ''),
      uri: data.u ? String(data.u) : '',
      identifier: data.i ? String(data.i) : '',
    };
  } catch {
    return null;
  }
}
