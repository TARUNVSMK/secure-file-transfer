import rateLimit from "express-rate-limit";
import { apiConfig } from "../config.js";
import { acquireUploadSlot } from "../services/uploadGuard.js";
import { reserveUploadQuotaSlot } from "../services/uploadQuota.js";

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

export const uploadQuotaLimiter = (request, response, next) => {
  let reservation;

  try {
    reservation = reserveUploadQuotaSlot(request.ip);
  } catch (error) {
    next(error);
    return;
  }

  let settled = false;
  const settleReservation = () => {
    if (settled) {
      return;
    }

    settled = true;
    if (response.statusCode < 400) {
      reservation.commit();
      return;
    }

    reservation.release();
  };

  response.once("finish", settleReservation);
  response.once("close", settleReservation);

  next();
};

export const uploadConcurrencyLimiter = (request, response, next) => {
  let releaseSlot;

  try {
    releaseSlot = acquireUploadSlot(request.ip);
  } catch (error) {
    next(error);
    return;
  }

  let released = false;
  const releaseOnce = () => {
    if (released) {
      return;
    }

    released = true;
    releaseSlot();
  };

  response.once("finish", releaseOnce);
  response.once("close", releaseOnce);

  next();
};
