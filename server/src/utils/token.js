import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

function getJwtSecret() {
  if (!env.JWT_SECRET || env.JWT_SECRET === "change-this-secret") {
    if (env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET chưa được cấu hình an toàn cho production.");
    }
  }
  return env.JWT_SECRET;
}

export function createRandomToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}
