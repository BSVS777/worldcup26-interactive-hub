// Shared fetch-fallback + load-memoization + generation-guard plumbing for
// views that load endpoints in parallel and must survive rapid
// reset()/ensureLoaded() cycles without a stale load clobbering fresher state.

export function formatScore(game) {
  return game.played && game.homeScore !== null && game.awayScore !== null
    ? `${game.homeScore} – ${game.awayScore}`
    : 'Not played yet';
}

export function createLoadableView(api) {
  let loadPromise = null;
  let generation = 0;

  async function fetchOrFallback(endpointKey) {
    try {
      const { data, stale = false, cachedAt = null, source = 'network' } = await api.apiRequest(endpointKey);
      return { data, failed: false, stale: Boolean(stale), cachedAt, source };
    } catch {
      return { data: [], failed: true, stale: false, cachedAt: null, source: 'error' };
    }
  }

  async function runLoad(loadFn, isCurrent) {
    const shouldRetry = await loadFn(isCurrent);
    if (shouldRetry) loadPromise = null;
    return shouldRetry;
  }

  // loadFn receives isCurrent(), a check for "am I still the latest load"
  // to run after awaiting the fetches. loadFn should return true if this
  // was a fatal failure that should allow a future ensureLoaded() to retry.
  function ensureLoaded(loadFn) {
    if (loadPromise) return loadPromise;
    const myGeneration = ++generation;
    const isCurrent = () => myGeneration === generation;
    loadPromise = runLoad(loadFn, isCurrent);
    return loadPromise;
  }

  function reset() {
    generation++; // supersede any in-flight load
    loadPromise = null;
  }

  return Object.freeze({ fetchOrFallback, ensureLoaded, reset });
}
