const SECRET_PATTERNS = Object.freeze([
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(password\s*[:=]\s*)[^\s,}]+/gi,
  /(token\s*[:=]\s*)[^\s,}]+/gi,
  /(api[_-]?key\s*[:=]\s*)[^\s,}]+/gi
]);

export function redactSecrets(value) {
  let output = String(value ?? '');
  for (const pattern of SECRET_PATTERNS) output = output.replace(pattern, '$1[REDACTED]');
  return output;
}

export function createSafeLogger({ enabled = false, consoleImpl = console } = {}) {
  function log(level, ...parts) {
    if (!enabled) return;
    const safeParts = parts.map(redactSecrets);
    consoleImpl[level]?.(...safeParts);
  }
  return Object.freeze({
    info: (...parts) => log('info', ...parts),
    warn: (...parts) => log('warn', ...parts),
    error: (...parts) => log('error', ...parts)
  });
}

export function isLocalHttpOrigin(location = globalThis.location) {
  const host = location?.hostname;
  return (location?.protocol === 'http:' || location?.protocol === 'https:')
    && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]');
}

export function safeExternalUrl(rawUrl, { allowedHosts = new Set(), allowedProtocols = new Set(['https:']) } = {}) {
  try {
    const url = new URL(String(rawUrl));
    if (!allowedProtocols.has(url.protocol)) return null;
    if (allowedHosts.size > 0 && !allowedHosts.has(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}
