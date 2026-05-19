import { PLAN } from "../constants/plan.js";

const PLAN_SET = new Set(Object.values(PLAN));

export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt
  };
}

export function isValidPlan(plan) {
  return PLAN_SET.has(plan);
}
