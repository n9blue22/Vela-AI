export const PLAN = {
  MIEN_PHI: "mien_phi",
  TIET_KIEM: "tiet_kiem",
  CAO_CAP: "cao_cap"
};

export const PLAN_LIMITS = {
  [PLAN.MIEN_PHI]: {
    label: "Miễn phí",
    maxLeads: 30,
    dailyContentGenerations: 5,
    canUseAdvancedTemplates: false
  },
  [PLAN.TIET_KIEM]: {
    label: "Tiết kiệm",
    maxLeads: 200,
    dailyContentGenerations: 35,
    canUseAdvancedTemplates: true
  },
  [PLAN.CAO_CAP]: {
    label: "Cao cấp",
    maxLeads: Number.MAX_SAFE_INTEGER,
    dailyContentGenerations: 300,
    canUseAdvancedTemplates: true
  }
};

export function getPlanLimit(plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS[PLAN.MIEN_PHI];
}

