"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import { useStore } from "@/lib/store";
import {
  activePatients,
  visitedToday,
  measuredToday,
  feverFreeStreak,
  latestVitals,
  tempCategory,
  spo2Category,
  hrCategory,
  todayStr,
  isDischargeEligible,
  isVisitOverdue,
} from "@/lib/logic";
import { DISCHARGE_FEVER_FREE_DAYS, FEVER_THRESHOLD_F } from "@/lib/constants";
import { Patient } from "@/lib/types";

type Filter = "discharge" | "fever" | "routine";

export default function DoctorPage() {
  const { patients, acknowledgePage, addVisit } = useStore();
  const list = activePatients(patients).sort((a, b) => a.bed.localeCompare(b.bed));

  const escalations = patients.flatMap((p) => p.pages.filter((pg) => pg.status === "paging").map((pg) => ({ patient: p, page: pg })));
  const dischargeReady = list.filter((p) => p.status === "discharge_pending");
  const feverSpikes = list.filter((p) => {
    const v = latestVitals(p);
    return p.status === "active" && v && tempCategory(v.tempF).tone === "bad";
  });
  const routine = list.filter((p) => p.status === "active" && !feverSpikes.includes(p));
  const notVisited = list.filter((p) => p.status === "active" && !visitedToday(p));

  const [filter, setFilter] = useState<Filter>(dischargeReady.length > 0 ? "discharge" : feverSpikes.length > 0 ? "fever" : "routine");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);

  const tabLists: Record<Filter, Patient[]> = { discharge: dischargeReady, fever: feverSpikes, routine };
  const filtered = tabLists[filter].filter(
    (p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.bed.includes(search)
  );

  const selected = patients.find((p) => p.id === selectedId) ?? filtered[0] ?? list[0];

  // Eligible-but-not-yet-visited-today patients: a "batch approve" flags all of
  // them for admin handoff in one click by logging today's round visit, which
  // is the real gating action per the facility's discharge policy.
  const eligibleAwaitingVisit = list.filter((p) => p.status === "active" && isDischargeEligible(p) && !visitedToday(p));

  function batchApprove() {
    eligibleAwaitingVisit.forEach((p) =>
      addVisit(p.id, { date: todayStr(), time: new Date().toTimeString().slice(0, 5), doctorName: "Dr. (you)", notes: "Batch round approval" })
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Doctor" />
      <main className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Summary bar */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[26px]">stethoscope</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] text-on-surface font-extrabold">Clinical Rounds &amp; Discharge Review</h1>
              <p className="font-body-sm text-[12px] text-on-surface-variant">Facility-wide isolation ward</p>
            </div>
          </div>
          <div className="hidden lg:block h-10 w-px bg-surface-container-highest" />
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <Metric label="Scheduled Rounds" value={notVisited.length} unit="patients" />
            <Metric label="Discharge Candidates" value={dischargeReady.length} unit={`${DISCHARGE_FEVER_FREE_DAYS}/${DISCHARGE_FEVER_FREE_DAYS} days`} tone="primary" />
            <Metric label="Critical Fever Flags" value={feverSpikes.length} unit={`≥${FEVER_THRESHOLD_F}°F`} tone="error" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto justify-end">
            <button
              onClick={batchApprove}
              disabled={eligibleAwaitingVisit.length === 0}
              className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Batch-Approve {eligibleAwaitingVisit.length} for Admin Handoff
            </button>
          </div>
        </div>

        {dischargeReady.length > 0 && (
          <div className="w-full bg-secondary-container text-on-secondary-container px-4 py-3 rounded-xl flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
            <p className="font-body-sm text-[13px]">
              <strong>Quarantine release protocol met:</strong> {dischargeReady.length} patient(s) afebrile for {DISCHARGE_FEVER_FREE_DAYS} days
              and ready for admin discharge review.
            </p>
          </div>
        )}

        {escalations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-error mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">emergency</span>
              Active escalations
            </h2>
            <div className="rounded-xl border border-error/30 bg-error-container/40 divide-y divide-error/15">
              {escalations.map(({ patient, page }) => (
                <div key={page.id} className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-on-error-container">
                      {patient.name} <span className="font-normal">· Bed {patient.bed}</span>
                    </div>
                    <div className="text-xs text-on-error-container/90">
                      {page.reason.replace("_", " ")} · raised by {page.raisedBy} at {page.time}
                    </div>
                    {page.notes && <div className="text-xs text-on-error-container/80 mt-0.5 italic">&quot;{page.notes}&quot;</div>}
                  </div>
                  <button
                    onClick={() => acknowledgePage(patient.id, page.id, "Dr. (you)")}
                    className="text-sm font-bold px-3 py-1.5 rounded-lg bg-error text-white hover:opacity-90"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT: worklist */}
          <div className="xl:col-span-7 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-3 rounded-xl shadow-sm border border-surface-container-highest">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <TabButton label={`Ready for Discharge (${dischargeReady.length})`} active={filter === "discharge"} onClick={() => setFilter("discharge")} />
                <TabButton label={`Active Fever Spikes (${feverSpikes.length})`} active={filter === "fever"} onClick={() => setFilter("fever")} />
                <TabButton label={`Routine Rounds (${routine.length})`} active={filter === "routine"} onClick={() => setFilter("routine")} />
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-2 rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-outline">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter bed or name..."
                  className="bg-transparent text-on-surface font-body-sm text-[13px] focus:outline-none w-full sm:w-36"
                />
              </div>
            </div>

            {filtered.length === 0 && (
              <p className="text-sm text-on-surface-variant px-4 py-6 text-center bg-white rounded-xl border border-surface-container-highest">
                No patients in this view.
              </p>
            )}

            {filtered.map((p) => (
              <WorklistCard key={p.id} patient={p} selected={p.id === selected?.id} onSelect={() => setSelectedId(p.id)} />
            ))}
          </div>

          {/* RIGHT: deep-dive console */}
          <div className="xl:col-span-5">{selected && <DeepDive patient={selected} />}</div>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone?: "primary" | "error" }) {
  const toneClass = tone === "error" ? "text-error" : tone === "primary" ? "text-primary" : "text-on-surface";
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`font-metric-display text-[26px] ${toneClass}`}>{value}</span>
        <span className="font-label-sm text-[11px] text-on-surface-variant">{unit}</span>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg font-label-md text-[12px] whitespace-nowrap transition-colors ${
        active ? "bg-primary-container text-white font-semibold shadow-sm" : "text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      {label}
    </button>
  );
}

function WorklistCard({ patient, selected, onSelect }: { patient: Patient; selected: boolean; onSelect: () => void }) {
  const { streak } = feverFreeStreak(patient);
  const v = latestVitals(patient);
  const cat = v ? tempCategory(v.tempF) : null;
  const eligible = isDischargeEligible(patient);
  const measured = measuredToday(patient);
  const overdue = isVisitOverdue(patient);

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-xl shadow-sm transition-all hover:shadow-md cursor-pointer p-4 flex flex-col gap-3 border ${
        selected ? "border-primary ring-1 ring-primary" : cat?.tone === "bad" ? "border-error/20" : "border-surface-container-highest"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-[13px] font-bold">BED {patient.bed}</div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-headline-sm text-[15px] text-on-surface font-bold">{patient.name}</h3>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[10px]">
                {patient.sex}, {patient.age}
              </span>
            </div>
            <div className="text-[12px] text-on-surface-variant mt-0.5">{patient.assignedDoctor}</div>
          </div>
        </div>
        {eligible ? (
          <Badge label={`Discharge Eligible (${streak}/${DISCHARGE_FEVER_FREE_DAYS})`} tone="ok" />
        ) : cat?.tone === "bad" ? (
          <Badge label="Active Fever Spike" tone="bad" />
        ) : (
          <Badge label={`Streak ${streak}/${DISCHARGE_FEVER_FREE_DAYS}`} tone="neutral" />
        )}
      </div>

      {v && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-container-low p-2.5 rounded-lg">
          <MiniStat icon="device_thermostat" label="Temp" value={`${v.tempF}°F`} tone={cat?.tone} />
          <MiniStat icon="air" label="SpO2" value={v.spo2 != null ? `${v.spo2}%` : "—"} tone={v.spo2 != null ? spo2Category(v.spo2).tone : "ok"} />
          <MiniStat icon="ecg_heart" label="HR" value={v.hr != null ? `${v.hr} bpm` : "—"} tone={v.hr != null ? hrCategory(v.hr).tone : "ok"} />
          <MiniStat icon="airwave" label="RR" value={v.rr != null ? `${v.rr}/min` : "—"} />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {overdue && <Badge label="Visit overdue" tone="bad" />}
        {!measured && <Badge label="No vitals today" tone="warn" />}
        <Link href={`/doctor/${patient.id}`} onClick={(e) => e.stopPropagation()} className="ml-auto text-[13px] font-bold text-primary flex items-center gap-1">
          Open full chart <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: string; label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const toneClass = tone === "bad" ? "text-error" : tone === "warn" ? "text-on-surface" : "text-on-surface";
  return (
    <div className="flex items-center gap-1.5">
      <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">{icon}</span>
      <div>
        <span className="text-on-surface-variant font-label-sm text-[10px] block">{label}</span>
        <span className={`font-bold text-[12px] ${toneClass}`}>{value}</span>
      </div>
    </div>
  );
}

function DeepDive({ patient }: { patient: Patient }) {
  const { addVisit } = useStore();
  const [note, setNote] = useState("");
  const alreadyVisited = visitedToday(patient);
  const canAct = patient.status === "active" || patient.status === "discharge_pending";
  const recent = patient.vitals.slice(-7);
  const signs = latestVitals(patient)?.signs ?? [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-4 sticky top-28">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-headline-sm font-bold shrink-0">
            {patient.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <h2 className="font-headline-sm text-[16px] text-on-surface font-bold leading-tight">{patient.name}</h2>
            <p className="font-body-sm text-[12px] text-on-surface-variant">
              Bed {patient.bed} · {patient.sex}, {patient.age}
            </p>
          </div>
        </div>
        <Link href={`/doctor/${patient.id}`} className="text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[20px]">open_in_full</span>
        </Link>
      </div>

      <div className="flex items-center gap-1.5 font-label-sm text-[12px] text-primary font-semibold">
        <span className="material-symbols-outlined text-[15px]">medical_services</span>
        <span>Assigned: {patient.assignedDoctor}</span>
      </div>

      {recent.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">show_chart</span>
            <span className="font-label-md text-[12px] text-on-surface font-bold">Temperature trend ({recent.length} readings)</span>
          </div>
          <TempSparkline readings={recent} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <span className="font-label-md text-[12px] text-on-surface font-bold col-span-2">Symptom evaluation</span>
        {signs.length === 0 && <p className="text-on-surface-variant text-[12px] col-span-2">No symptoms reported in latest round.</p>}
        {signs.map((s) => (
          <div key={s} className="p-2 rounded-lg bg-error-container/40 text-on-error-container text-[12px] font-medium">
            {s}
          </div>
        ))}
      </div>

      <div>
        <span className="font-label-md text-[12px] text-on-surface font-bold block mb-1.5">Round log</span>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {[...patient.visits].reverse().map((v) => (
            <div key={v.id} className="bg-surface-container-low p-2.5 rounded-lg">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-on-surface">{v.doctorName}</span>
                <span className="text-on-surface-variant">
                  {v.date} {v.time}
                </span>
              </div>
              {v.notes && <p className="text-[12px] text-on-surface-variant mt-1">{v.notes}</p>}
            </div>
          ))}
          {patient.visits.length === 0 && <p className="text-[12px] text-on-surface-variant">No rounds logged yet.</p>}
        </div>
      </div>

      {canAct && (
        <div className="pt-2 border-t border-surface-container-highest">
          {alreadyVisited ? (
            <p className="text-[12px] text-on-surface-variant">Already visited today.</p>
          ) : (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter clinical round notes..."
                rows={2}
                className="w-full bg-surface-container p-2.5 rounded-xl font-body-sm text-[12px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => {
                  addVisit(patient.id, { date: todayStr(), time: new Date().toTimeString().slice(0, 5), doctorName: "Dr. (you)", notes: note || undefined });
                  setNote("");
                }}
                className="mt-2 w-full px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-white font-bold text-[13px]"
              >
                Save &amp; sign round
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TempSparkline({ readings }: { readings: Patient["vitals"] }) {
  const w = 460;
  const h = 100;
  const values = readings.map((r) => r.tempF);
  const min = Math.min(95, ...values);
  const max = Math.max(103, ...values);
  const x = (i: number) => (readings.length <= 1 ? w / 2 : (i / (readings.length - 1)) * (w - 40) + 20);
  const y = (t: number) => h - 15 - ((t - min) / (max - min)) * (h - 35);
  const thresholdY = y(FEVER_THRESHOLD_F);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  return (
    <div className="bg-surface-container-low p-3 rounded-xl">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        <line x1="0" x2={w} y1={thresholdY} y2={thresholdY} stroke="#ba1a1a" strokeDasharray="4,4" strokeWidth="1" />
        <text x={w - 4} y={thresholdY - 4} fontSize="9" fill="#ba1a1a" textAnchor="end" fontWeight="700">
          {FEVER_THRESHOLD_F}°F
        </text>
        <polyline points={points} fill="none" stroke="#006194" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={v >= FEVER_THRESHOLD_F ? 4 : 3} fill={v >= FEVER_THRESHOLD_F ? "#ba1a1a" : "#006194"} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-on-surface-variant font-semibold mt-1">
        {readings.map((r, i) => (
          <span key={i}>{r.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}
