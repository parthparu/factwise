export const FEVER_THRESHOLD_F = 100.4; // 38.0 C
export const LOW_GRADE_FEVER_F = 99.5; // 37.5 C
export const CAPACITY = 74;
export const SUCCESS_BENCHMARK_PCT = 85;
export const DISCHARGE_FEVER_FREE_DAYS = 3;

export const SPO2_TARGET = 95;
export const SPO2_MILD_HYPOXIA = 92;

export const HR_BASELINE = 76;
export const HR_TACHYCARDIA = 100;

export const RR_NORMAL_MAX = 20;

// Hour-of-day (local, 24h) after which an undone daily task counts as
// "overdue" rather than just "not done yet" — mirrors the facility's stated
// problem of patients going unmeasured / unvisited for a whole day.
export const VITALS_OVERDUE_HOUR = 12; // noon
export const VISIT_OVERDUE_HOUR = 16; // 4pm

export const OBSERVED_SIGNS = [
  "Diaphoretic / Chills",
  "Productive Cough",
  "Chest Tightness",
  "Nausea",
];

export const PAGE_REASONS = [
  { value: "temp_spike", label: "Temperature Spike (fever threshold crossed)" },
  { value: "spo2_crash", label: "SpO2 Desaturation (<95% or crash)" },
  { value: "resp_distress", label: "Respiratory Distress / Tachypnea" },
  { value: "deterioration", label: "General Urgent Clinical Deterioration" },
] as const;
