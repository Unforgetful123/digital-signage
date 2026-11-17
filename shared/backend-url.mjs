export function automaticBackend(location) {
  if (!['http:', 'https:'].includes(location.protocol)) return 'http://127.0.0.1:8090';
  const url = new URL(location.href);
  url.port = '8090'; url.pathname = ''; url.search = ''; url.hash = '';
  return url.origin;
}
export function validateBackend(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname)) {
    throw new Error('Use a server address such as http://signage-server:8090, without a path or credentials.');
  }
  return url.origin;
}
export function resolveBackend(location, override, legacyEnv = '') {
  if (override) return validateBackend(override);
  // Browser URLs follow the server used to open the app. Ignore stale build-time IPs.
  if (location.protocol !== 'file:') return automaticBackend(location);
  return legacyEnv ? validateBackend(legacyEnv) : automaticBackend(location);
}
