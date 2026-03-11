import rateLimit from "express-rate-limit";
import { apiConfig } from "../config.js";

const buildLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

export const apiLimiter = buildLimiter(
  apiConfig.apiRateLimitWindowMs,
  apiConfig.apiRateLimitMax,
  "Too many API requests. Please try again later.",
);

export const uploadLimiter = buildLimiter(
  apiConfig.uploadRateLimitWindowMs,
  apiConfig.uploadRateLimitMax,
  "Upload rate limit reached. Please wait before uploading again.",
);
