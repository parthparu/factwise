"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import { useStore } from "@/lib/store";
import {
  feverFreeStreak,
  visitedToday,
  measuredToday,
  todayStr,
  isDischargeEligible,
  latestVitals,
  tempCategory,
  spo2Category,
  hrCategory,
  rrCategory,
} from "@/lib/logic";
import { DISCHARGE_FEVER_FREE_DAYS } from "@/lib/constants";

export default function DoctorPatientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { patients, addVisit, setStatus, acknowledgePage } = useStore();
  const [notes, setNotes] = useState("");

  const patient = patients.find((p) => p.id === id);
  if (!patient) {
    return (
      <div className="flex-1 flex flex-col">
        <Header role="Doctor" />
        <main className="max-w-3xl mx-auto px-6 py-10">Patient not found.</main>
      </div>
    );
  }

  const { streak, brokenByGap } = feverFreeStreak(patient);
  const eligible = isDischargeEligible(patient);
  const alreadyVisited = visitedToday(patient);
  const hasVitalsToday = measuredToday(patient);
  const history = [...patient.vitals].reverse();
  const canAct = patient.status === "active" || patient.status === "discharge_pending";
  const last = latestVitals(patient);
  const openPages = patient.pages.filter((p) => p.status === "paging");
  const recentSpo2Ok = patient.vitals.slice(-3).every((v) => (v.spo2 ?? 100) >= 95) && patient.vitals.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Doctor" />
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <button onClick={() => router.push("/doctor")} className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to rounds
        </button>

        <div className="flex items-start justify-between mb-6 flex-wrap gap-2">
          <div>
            <h1 className="font-headline-lg text-[24px] font-extrabold text-on-surface">{patient.name}</h1>
            <p className="text-on-surface-variant text-sm">
              Bed {patient.bed} · {patient.sex}, {patient.age} · Admitted {patient.admittedDate} · {patient.assignedDoctor}
            </p>
          </div>
          <StatusBadge status={patient.status} />
        </div>

        {openPages.length > 0 && (
          <div className="rounded-xl border border-error/30 bg-error-container/40 p-4 mb-6">
            <p className="font-bold text-on-error-container flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">emergency</span> Active escalation
            </p>
            {openPages.map((pg) => (
              <div key={pg.id} className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm text-on-error-container">
                  {pg.reason.replace("_", " ")} · raised by {pg.raisedBy} at {pg.time}
                  {pg.notes && <div className="italic text-on-error-container/80">&quot;{pg.notes}&quot;</div>}
                </div>
                <button
                  onClick={() => acknowledgePage(patient.id, pg.id, "Dr. (you)")}
                  className="text-sm font-bold px-3 py-1.5 rounded-lg bg-error text-white hover:opacity-90"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Fever-free streak" value={`${streak} / ${DISCHARGE_FEVER_FREE_DAYS} days`} />
          <Stat label="Today's vitals" value={hasVitalsToday ? "Recorded" : "Not recorded"} warn={!hasVitalsToday} />
          <Stat label="Visited today" value={alreadyVisited ? "Yes" : "No"} warn={!alreadyVisited} />
          <Stat label="Latest SpO2" value={last?.spo2 ? `${last.spo2}%` : "—"} warn={last?.spo2 != null && spo2Category(last.spo2).tone !== "ok"} />
        </div>

        {last && (
          <div className="grid sm:grid-cols-4 gap-3 mb-6">
            <MiniVital label="Temp" value={`${last.tempF}°F`} tone={tempCategory(last.tempF).tone} />
            <MiniVital label="SpO2" value={`${last.spo2 ?? "—"}%`} tone={last.spo2 != null ? spo2Category(last.spo2).tone : "ok"} />
            <MiniVital label="HR" value={`${last.hr ?? "—"} bpm`} tone={last.hr != null ? hrCategory(last.hr).tone : "ok"} />
            <MiniVital label="RR" value={`${last.rr ?? "—"} /min`} tone={last.rr != null ? rrCategory(last.rr).tone : "ok"} />
          </div>
        )}

        {!hasVitalsToday && canAct && (
          <Banner>No vitals have been logged for this patient today — ask a nurse before finalizing treatment decisions.</Banner>
        )}
        {brokenByGap && <Banner>There is a gap in this patient&apos;s temperature log, so the fever-free streak was reset at the gap.</Banner>}

        <div className="rounded-xl border border-surface-container-highest bg-white p-4 mb-6">
          <h2 className="font-bold mb-2 text-on-surface">Quarantine discharge protocol</h2>
          <div className="flex items-center justify-between font-label-md text-[13px] mb-2">
            <span>Facility policy: discharge is decided solely on the 3-day fever-free rule.</span>
            <span className={`font-bold ${eligible ? "text-primary" : "text-error"}`}>
              {streak} / {DISCHARGE_FEVER_FREE_DAYS} days met
            </span>
          </div>
          <ChecklistItem ok={eligible} label={`${DISCHARGE_FEVER_FREE_DAYS} consecutive fever-free days (<100.4°F)`} gating />
          <ChecklistItem ok={recentSpo2Ok} label="SpO2 consistently ≥95% on recent readings (informational only)" />
        </div>

        {eligible && patient.status === "discharge_pending" && (
          <div className="rounded-xl border border-secondary-fixed-dim bg-secondary-container/30 p-4 mb-6">
            <p className="font-medium text-on-secondary-container">Eligible for discharge — {streak} consecutive fever-free days reported.</p>
            <p className="text-sm text-on-secondary-container/80 mt-1">Admin staff has been notified to process the discharge.</p>
            <button disabled className="mt-3 bg-primary/60 text-white text-sm font-medium px-4 py-2 rounded-md" title="Already flagged for admin">
              Flagged for admin ✓
            </button>
          </div>
        )}

        {canAct && (
          <div className="rounded-xl border border-surface-container-highest bg-white p-4 mb-6">
            <h2 className="font-bold mb-2 text-on-surface">Log today&apos;s visit</h2>
            {alreadyVisited ? (
              <p className="text-sm text-on-surface-variant">Already visited today.</p>
            ) : (
              <>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Treatment notes (optional)"
                  className="w-full border border-surface-container-highest rounded-md px-3 py-2 text-sm mb-2"
                  rows={2}
                />
                <button
                  onClick={() => {
                    addVisit(patient.id, {
                      date: todayStr(),
                      time: new Date().toTimeString().slice(0, 5),
                      doctorName: "Dr. (you)",
                      notes: notes || undefined,
                    });
                    setNotes("");
                  }}
                  className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg"
                >
                  Mark visited
                </button>
              </>
            )}
          </div>
        )}

        {canAct && (
          <div className="rounded-xl border border-error/30 bg-error-container/30 p-4 mb-6">
            <h2 className="font-bold text-on-error-container mb-2">Outcome</h2>
            <p className="text-sm text-on-error-container/90 mb-2">
              Record if the patient has died, for facility mortality-rate tracking (15% expected, 85% success benchmark).
            </p>
            <button
              onClick={() => {
                if (confirm(`Confirm: mark ${patient.name} as deceased? This cannot be undone.`)) {
                  setStatus(patient.id, "deceased", { dischargedDate: todayStr() });
                }
              }}
              className="text-sm font-bold px-4 py-2 rounded-lg border border-error/40 text-error hover:bg-error-container/50"
            >
              Mark as deceased
            </button>
          </div>
        )}

        <div>
          <h2 className="font-bold mb-2 text-on-surface">Vitals history</h2>
          <div className="rounded-xl border border-surface-container-highest bg-white divide-y divide-surface-container-highest">
            {history.length === 0 && <p className="text-sm text-on-surface-variant px-4 py-3">No readings yet.</p>}
            {history.map((v) => (
              <div key={v.id} className="flex justify-between px-4 py-2 text-sm flex-wrap gap-1">
                <span>
                  {v.date} {v.time}
                </span>
                <span className={tempCategory(v.tempF).tone === "bad" ? "text-error font-bold" : "text-on-surface"}>
                  {v.tempF}°F {v.spo2 != null ? `· SpO2 ${v.spo2}%` : ""} {v.hr != null ? `· HR ${v.hr}` : ""}
                </span>
                <span className="text-on-surface-variant">{v.recordedBy}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-surface-container-highest bg-white p-3">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className={`text-base font-bold ${warn ? "text-error" : "text-on-surface"}`}>{value}</div>
    </div>
  );
}

function MiniVital({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" }) {
  const toneText = tone === "bad" ? "text-error" : tone === "warn" ? "text-on-surface" : "text-primary";
  return (
    <div className="rounded-xl border border-surface-container-highest bg-white p-3 text-center">
      <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-extrabold ${toneText}`}>{value}</div>
    </div>
  );
}

function ChecklistItem({ ok, label, gating }: { ok: boolean; label: string; gating?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm py-1">
      <span className={`material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5 ${ok ? "text-primary" : "text-error"}`}>
        {ok ? "check_circle" : "radio_button_unchecked"}
      </span>
      <span className={ok ? "text-on-surface" : gating ? "text-error font-semibold" : "text-on-surface-variant"}>{label}</span>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm px-4 py-3 mb-6">{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
    active: "neutral",
    discharge_pending: "ok",
    discharged: "ok",
    deceased: "bad",
  };
  return <Badge label={status.replace("_", " ")} tone={toneMap[status] ?? "neutral"} />;
}
