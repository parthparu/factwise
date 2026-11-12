import { Patient } from "./types";
import {
  FEVER_THRESHOLD_F,
  LOW_GRADE_FEVER_F,
  DISCHARGE_FEVER_FREE_DAYS,
  CAPACITY,
  SUCCESS_BENCHMARK_PCT,
  SPO2_TARGET,
  SPO2_MILD_HYPOXIA,
  HR_BASELINE,
  HR_TACHYCARDIA,
  RR_NORMAL_MAX,
} from "./constants";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// All date-string arithmetic is done with UTC epoch days so it is immune to
// the local timezone offset (parsing "YYYY-MM-DDT00:00:00" as local time and
// re-serializing via toISOString() silently shifts the date in non-UTC zones).
function addDays(dateStr: string, delta: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, day) + delta * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function vitalsOnDate(patient: Patient, date: string) {
  return patient.vitals.filter((v) => v.date === date);
}

export function visitOnDate(patient: Patient, date: string) {
  return patient.visits.find((v) => v.date === date);
}

export function measuredToday(patient: Patient, date = todayStr()): boolean {
  return vitalsOnDate(patient, date).length > 0;
}

export function visitedToday(patient: Patient, date = todayStr()): boolean {
  return !!visitOnDate(patient, date);
}

export function hasFeverOn(patient: Patient, date: string): boolean {
  const readings = vitalsOnDate(patient, date);
  if (readings.length === 0) return false;
  return readings.some((v) => v.tempF >= FEVER_THRESHOLD_F);
}

export function latestVitals(patient: Patient) {
  if (patient.vitals.length === 0) return null;
  return [...patient.vitals].sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))[0];
}

/**
 * Walk backward day by day from `date`. A day only counts toward the
 * fever-free streak if it was actually reported (has a vitals reading) and
 * none of that day's temperature readings hit the fever threshold. The
 * first gap or fever day stops the count.
 */
export function feverFreeStreak(patient: Patient, from = todayStr()) {
  let streak = 0;
  let cursor = from;
  let brokenByGap = false;
  for (let i = 0; i < 30; i++) {
    const readings = vitalsOnDate(patient, cursor);
    if (readings.length === 0) {
      if (i === 0) {
        cursor = addDays(cursor, -1);
        continue;
      }
      brokenByGap = true;
      break;
    }
    if (readings.some((v) => v.tempF >= FEVER_THRESHOLD_F)) break;
    streak++;
    cursor = addDays(cursor, -1);
    if (cursor < patient.admittedDate) break;
  }
  return { streak, brokenByGap };
}

export function isDischargeEligible(patient: Patient): boolean {
  if (patient.status !== "active" && patient.status !== "discharge_pending") return false;
  return feverFreeStreak(patient).streak >= DISCHARGE_FEVER_FREE_DAYS;
}

export function activePatients(patients: Patient[]) {
  return patients.filter((p) => p.status === "active" || p.status === "discharge_pending");
}

export function occupancyStats(patients: Patient[]) {
  const occupied = activePatients(patients).length;
  return { occupied, capacity: CAPACITY, full: occupied >= CAPACITY, remaining: Math.max(0, CAPACITY - occupied) };
}

export function mortalityStats(patients: Patient[]) {
  const discharged = patients.filter((p) => p.status === "discharged").length;
  const deceased = patients.filter((p) => p.status === "deceased").length;
  const resolved = discharged + deceased;
  const successRate = resolved === 0 ? null : (discharged / resolved) * 100;
  const mortalityRate = resolved === 0 ? null : (deceased / resolved) * 100;
  return {
    discharged,
    deceased,
    resolved,
    successRate,
    mortalityRate,
    meetsBenchmark: successRate === null ? null : successRate >= SUCCESS_BENCHMARK_PCT,
  };
}

export function bedTaken(patients: Patient[], bed: string, excludeId?: string) {
  return activePatients(patients).some((p) => p.bed === bed && p.id !== excludeId);
}

// ---- Vital classification helpers (UI badges) ----

export function tempCategory(tempF: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (tempF >= FEVER_THRESHOLD_F) return { label: "High Grade Fever (Spiking)", tone: "bad" };
  if (tempF >= LOW_GRADE_FEVER_F) return { label: "Low Grade Fever / Sub-febrile", tone: "warn" };
  return { label: "Afebrile / Within Normal Range", tone: "ok" };
}

export function spo2Category(spo2: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (spo2 < SPO2_MILD_HYPOXIA) return { label: "Critical Hypoxia", tone: "bad" };
  if (spo2 < SPO2_TARGET) return { label: "Mild Hypoxia", tone: "warn" };
  return { label: "Normal Oxygenation", tone: "ok" };
}

export function hrCategory(hr: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (hr >= HR_TACHYCARDIA) return { label: "Tachycardia", tone: "bad" };
  if (hr < 50) return { label: "Bradycardia", tone: "warn" };
  return { label: "Normal", tone: "ok" };
}

export function rrCategory(rr: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (rr > RR_NORMAL_MAX) return { label: "Tachypnea", tone: "bad" };
  if (rr < 12) return { label: "Bradypnea", tone: "warn" };
  return { label: "Normal", tone: "ok" };
}

export function bpCategory(sys: number, dia: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (sys >= 140 || dia >= 90) return { label: "Stage 2 Elevated", tone: "bad" };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1 Elevated", tone: "warn" };
  return { label: "Normal", tone: "ok" };
}

export const hrBaseline = HR_BASELINE;
