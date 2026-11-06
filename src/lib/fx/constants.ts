/**
 * FX cache lifetimes (OPEN-003 documented default for Phase 10).
 * Fresh quotes are preferred; stale quotes are last-good fallback only.
 */
export const FX_CACHE_TTL_SECONDS = 3_600;
export const FX_STALE_TTL_SECONDS = 86_400;

/** Quotes older than this are rejected even as stale fallback. */
export const FX_MAX_STALE_AGE_MS = FX_STALE_TTL_SECONDS * 1_000;
