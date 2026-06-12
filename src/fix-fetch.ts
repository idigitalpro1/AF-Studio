// Fix for "Cannot set property fetch of #<Window> which has only a getter"
// This happens when libraries try to polyfill fetch in environments where
// window.fetch is already a non-configurable getter.
try {
  const targets = [
    typeof window !== 'undefined' ? window : null,
    typeof globalThis !== 'undefined' ? globalThis : null,
    typeof self !== 'undefined' ? self : null,
  ].filter(Boolean);

  for (const target of targets) {
    if (target && target.fetch) {
      try {
        const originalFetch = target.fetch;
        Object.defineProperty(target, 'fetch', {
          value: originalFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (_innerErr) {
        // Silently ignore - fetch is already working fine
      }
    }
  }
} catch (e) {
  // Silently ignore any errors
}
