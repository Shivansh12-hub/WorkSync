import {
  getLoginAttemptKey,
  getLoginBlockInfo,
} from "../utils/loginRateLimiter.js";

export const loginRateLimitGuard = (req, res, next) => {
  const email = req.authPayload?.email || req.body?.email || "";
  const key = getLoginAttemptKey(req.ip, email);
  const { blocked, retryAfterMs } = getLoginBlockInfo(key);

  req.loginThrottleKey = key;

  if (!blocked) {
    return next();
  }

  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    message: "Too many failed login attempts. Try again later.",
    retryAfterSeconds,
  });
};
