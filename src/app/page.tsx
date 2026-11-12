"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { activePatients, measuredToday, visitedToday, occupancyStats } from "@/lib/logic";

const ROLE_CARDS = [
  {
    key: "nurse",
    href: "/nurse",
    badge: "POINT-OF-CARE",
    accent: "bg-blue-600",
    title: "Nurse Station",
    subtitle: "Bedside vitals & escalation",
    desc: "Record bedside vitals, flag fever spikes against the 100.4°F threshold, and page the attending doctor directly from a patient's chart.",
    features: ["Temp / SpO2 / HR / BP / RR entry with live categorization", "One-tap nurse → doctor escalation & paging", "3-day fever-free streak tracked automatically"],
    passkey: "NURSE-74",
    cta: "Enter Vitals & Alert MD",
    ctaColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    key: "doctor",
    href: "/doctor",
    badge: "ATTENDING MD",
    accent: "bg-emerald-600",
    title: "Doctor Workstation",
    subtitle: "Rounds & discharge review",
    desc: "Review today's rounds worklist, acknowledge escalations, and approve discharges solely against the 3-day no-fever rule.",
    features: ["Per-patient temperature trend from logged vitals", "Discharge gated only on the 3-day fever-free rule", "Round notes logged to each patient's chart"],
    passkey: "CLINIC-MD",
    cta: "Enter Clinical Rounds & Discharge",
    ctaColor: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    key: "admin",
    href: "/admin",
    badge: "FACILITY OPS",
    accent: "bg-violet-600",
    title: "Admin & Operations",
    subtitle: "Bed census & KPI benchmark",
    desc: "Track the 74-bed floor map, confirm doctor-approved discharges, and monitor the facility's success rate against the 85% benchmark.",
    features: ["Interactive 74-bed floor map with live status", "Second sign-off discharge confirmation", "CSV roster & daily report export"],
    passkey: "CENSUS-OPS",
    cta: "Enter Floor Map & Census",
    ctaColor: "bg-violet-600 hover:bg-violet-700",
  },
];

export default function Home() {
  const router = useRouter();
  const { patients, reset } = useStore();
  const occ = occupancyStats(patients);
  const active = activePatients(patients);
  const pendingVitals = active.filter((p) => !measuredToday(p)).length;
  const notVisited = active.filter((p) => p.status === "active" && !visitedToday(p)).length;
  const dischargeReady = active.filter((p) => p.status === "discharge_pending").length;
  const escalations = patients.flatMap((p) => p.pages.filter((pg) => pg.status === "paging")).length;

  const secondaryStat: Record<string, string> = {
    nurse: `${pendingVitals}/${active.length} beds need vitals today`,
    doctor: `${notVisited} rounds · ${dischargeReady} discharge ready`,
    admin: `Facility: ${occ.occupied}/${occ.capacity} (${Math.round((occ.occupied / occ.capacity) * 100)}% full) · ${escalations} escalations`,
  };

  const [selectedRole, setSelectedRole] = useState(ROLE_CARDS[0].key);
  const selected = ROLE_CARDS.find((r) => r.key === selectedRole)!;

  return (
    <div className="flex-1 flex flex-col bg-surface">
      {/* Top bar */}
      <header className="w-full border-b border-surface-container-highest bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[18px]">shield</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-headline-sm text-[13px] text-on-surface font-extrabold uppercase tracking-tight">FeverTrack</span>
                <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[9px] font-bold">
                  {occ.occupied}/{occ.capacity}-BED ACTIVE
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE
                </span>
              </div>
              <div className="font-label-sm text-[10px] text-on-surface-variant">FactWise Junior TPM Assessment · Clinical Field Protocol</div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-label-sm text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-tertiary">schedule</span>
            <span>Shift: 07:00 – 19:00</span>
            <span className="text-outline-variant">·</span>
            <span className="px-2 py-0.5 rounded bg-surface-container-low">Prototype Mode</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-label-sm text-[11px] font-bold mb-4">
            <span className="material-symbols-outlined text-[14px]">key</span>
            SIMULATION ACCESS · PROTOTYPE CREDENTIALS ONLY — NOTHING HERE GATES REAL DATA
          </span>
          <h1 className="font-headline-xl text-[28px] sm:text-[34px] font-extrabold text-on-surface">Quarantine Clinical Workstation &amp; Triage Gateway</h1>
          <p className="text-on-surface-variant mt-2 max-w-xl mx-auto text-sm">
            Pick your role below to launch the matching screen — bedside vitals, physician rounds, or facility census &amp; KPIs.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {ROLE_CARDS.map((r) => (
            <div key={r.key} className="rounded-2xl bg-white shadow-sm border border-surface-container-highest overflow-hidden flex flex-col">
              <div className={`h-1.5 w-full ${r.accent}`} />
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-lg ${r.accent}/10 flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[18px] text-on-surface">medical_information</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-[9px] font-bold tracking-wide">
                    {r.badge}
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-[16px] text-on-surface font-bold">{r.title}</h2>
                  <p className="font-label-sm text-[11px] text-on-surface-variant">{r.subtitle}</p>
                </div>
                <p className="text-[12.5px] text-on-surface-variant leading-relaxed">{r.desc}</p>
                <ul className="flex flex-col gap-1.5 border-t border-surface-container-highest pt-3">
                  {r.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 flex-shrink-0">check</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2 mt-1">
                  <div>
                    <div className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wide">Assigned temp pass</div>
                    <div className="font-mono text-[12px] text-on-surface font-bold">{r.passkey}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[9px] font-bold">
                    Auto-Authorized
                  </span>
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => router.push(r.href)}
                  className={`w-full h-10 rounded-lg text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-sm transition-colors ${r.ctaColor}`}
                >
                  {r.cta}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <p className="text-center font-label-sm text-[10.5px] text-on-surface-variant">{secondaryStat[r.key]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick credential console */}
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-surface-container-highest p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
              <span className="font-headline-sm text-[14px] text-on-surface font-bold">Quick Role Switch</span>
            </div>
            <span className="font-label-sm text-[10px] text-on-surface-variant">Prototype Mode</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="font-label-sm text-[11px] text-on-surface-variant block mb-1">Select role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-surface-container-highest rounded-lg px-3 py-2 text-sm"
              >
                {ROLE_CARDS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-[11px] text-on-surface-variant block mb-1">Temporary passkey</label>
              <div className="w-full border border-surface-container-highest rounded-lg px-3 py-2 text-sm font-mono bg-surface-container-low text-on-surface-variant">
                {selected.passkey}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(selected.href)}
            className="w-full h-10 mt-4 rounded-lg bg-on-surface text-white font-bold text-[13px] flex items-center justify-center gap-1.5"
          >
            Launch {selected.title}
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => {
              if (confirm("Reset all demo data back to the seeded sample patients?")) reset();
            }}
            className="text-xs text-on-surface-variant hover:text-on-surface underline"
          >
            Reset demo data
          </button>
        </div>
      </main>

      <footer className="w-full border-t border-surface-container-highest bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 font-label-sm text-[10.5px] text-on-surface-variant">
          <span>Hopefield Isolation Facility · Emergency Quarantine Protocol Level 3</span>
          <span>FactWise Junior TPM Assessment Prototype</span>
        </div>
      </footer>
    </div>
  );
}
