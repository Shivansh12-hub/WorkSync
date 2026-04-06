const attemptsStore = new Map();

const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOCKOUT_WINDOW_MS =
  (Number(process.env.LOGIN_LOCKOUT_MINUTES) || 15) * 60 * 1000;
const STALE_ENTRY_MS = 24 * 60 * 60 * 1000;

const now = () => Date.now();

const normalizeIp = (ip = "unknown") => ip.toString().trim();
const normalizeEmail = (email = "") => email.toString().trim().toLowerCase();

const cleanupStaleEntries = () => {
  const cutoff = now() - STALE_ENTRY_MS;
  for (const [key, record] of attemptsStore.entries()) {
    if ((record.lastFailedAt || 0) < cutoff && (record.lockedUntil || 0) < now()) {
      attemptsStore.delete(key);
    }
  }
};

export const getLoginAttemptKey = (ip, email) => {
  const normalizedIp = normalizeIp(ip);
  const normalizedEmail = normalizeEmail(email);
  return `${normalizedIp}:${normalizedEmail || "_unknown"}`;
};

export const getLoginBlockInfo = (key) => {
  const record = attemptsStore.get(key);
  if (!record || !record.lockedUntil) {
    return { blocked: false, retryAfterMs: 0 };
  }

  const remainingMs = record.lockedUntil - now();
  if (remainingMs <= 0) {
    attemptsStore.delete(key);
    return { blocked: false, retryAfterMs: 0 };
  }

  return { blocked: true, retryAfterMs: remainingMs };
};

export const registerLoginFailure = (key) => {
  cleanupStaleEntries();

  const current = attemptsStore.get(key);
  const timestamp = now();

  if (!current) {
    attemptsStore.set(key, {
      failedAttempts: 1,
      firstFailedAt: timestamp,
      lastFailedAt: timestamp,
      lockedUntil: null,
    });
    return;
  }

  if (current.lockedUntil && current.lockedUntil > timestamp) {
    return;
  }

  const failedAttempts = (current.failedAttempts || 0) + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

  attemptsStore.set(key, {
    failedAttempts: shouldLock ? 0 : failedAttempts,
    firstFailedAt: current.firstFailedAt || timestamp,
    lastFailedAt: timestamp,
    lockedUntil: shouldLock ? timestamp + LOCKOUT_WINDOW_MS : null,
  });
};

export const clearLoginFailures = (key) => {
  attemptsStore.delete(key);
};
