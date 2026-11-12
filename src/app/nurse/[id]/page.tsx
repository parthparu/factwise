"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import { useStore } from "@/lib/store";
import {
  todayStr,
  tempCategory,
  spo2Category,
  hrCategory,
  rrCategory,
  bpCategory,
  hrBaseline,
  latestVitals,
  feverFreeStreak,
} from "@/lib/logic";
import { OBSERVED_SIGNS, PAGE_REASONS, DISCHARGE_FEVER_FREE_DAYS } from "@/lib/constants";
import { AVPU } from "@/lib/types";

const TEMP_PRESETS = [97.0, 98.6, 99.5, 100.4, 101.5, 103.0];

export default function NurseVitalsEntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { patients, addVitals, deleteVitals } = useStore();
  const patient = patients.find((p) => p.id === id);

  const last = patient ? latestVitals(patient) : null;
  const [temp, setTemp] = useState(last?.tempF ?? 98.6);
  const [spo2, setSpo2] = useState(last?.spo2 ?? 98);
  const [hr, setHr] = useState(last?.hr ?? 78);
  const [rr, setRr] = useState(last?.rr ?? 16);
  const [bpSys, setBpSys] = useState(last?.bpSys ?? 118);
  const [bpDia, setBpDia] = useState(last?.bpDia ?? 76);
  const [avpu, setAvpu] = useState<AVPU>(last?.avpu ?? "A");
  const [signs, setSigns] = useState<string[]>([]);
  const [showEscalation, setShowEscalation] = useState(false);
  const [reason, setReason] = useState<string>(PAGE_REASONS[0].value);
  const [notes, setNotes] = useState("");
  const [pageState, setPageState] = useState<"idle" | "paging" | "acknowledged">("idle");
  const [committed, setCommitted] = useState(false);

  if (!patient) {
    return (
      <div className="flex-1 flex flex-col">
        <Header role="Nurse" />
        <main className="max-w-3xl mx-auto px-6 py-10">Patient not found.</main>
      </div>
    );
  }

  const cat = tempCategory(temp);
  const { streak } = feverFreeStreak(patient);
  const canAct = patient.status === "active" || patient.status === "discharge_pending";

  function commit(alert: boolean) {
    if (!patient) return;
    addVitals(
      patient.id,
      {
        date: todayStr(),
        time: new Date().toTimeString().slice(0, 5),
        tempF: temp,
        spo2,
        hr,
        rr,
        bpSys,
        bpDia,
        avpu,
        signs: signs.length ? signs : undefined,
        notes: notes || undefined,
        recordedBy: "Nurse (you)",
      },
      alert ? { reason, notes, raisedBy: "Nurse (you)" } : undefined
    );
    if (alert) {
      setPageState("paging");
      setTimeout(() => setPageState("acknowledged"), 1800);
    } else {
      setCommitted(true);
      setTimeout(() => setCommitted(false), 2500);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Nurse" />
      <main className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <button onClick={() => router.push("/nurse")} className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to roster
        </button>

        {/* Patient banner */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-col sm:flex-row">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-container text-white flex items-center justify-center font-headline-lg text-[20px] sm:text-[24px] font-extrabold flex-shrink-0 shadow-sm">
              {patient.bed}
              {cat.tone === "bad" && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[13px]">priority_high</span>
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline-lg text-[20px] sm:text-[24px] text-on-surface font-extrabold tracking-tight">{patient.name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-surface-container-low font-label-sm text-[11px] text-on-surface font-bold border border-surface-container-highest">
                  {patient.sex} · {patient.age} yrs
                </span>
                {cat.tone !== "ok" && <Badge label={cat.tone === "bad" ? "FEVER SPIKE REPORTED" : "SUB-FEBRILE"} tone={cat.tone} />}
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-[12px] mt-1 flex-wrap font-medium">
                <span>Admitted {patient.admittedDate}</span>
                <span className="text-outline-variant">•</span>
                <span>Fever-free streak: {streak}/{DISCHARGE_FEVER_FREE_DAYS} days</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-surface-container-highest/80 flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">stethoscope</span>
            </div>
            <div>
              <div className="font-label-sm text-[10px] text-primary uppercase tracking-wider font-extrabold">Assigned Physician</div>
              <div className="font-headline-sm text-[14px] text-on-surface font-bold">{patient.assignedDoctor}</div>
            </div>
          </div>
        </div>

        {!canAct && (
          <div className="rounded-xl border border-surface-container-highest bg-surface-container-low text-on-surface-variant text-sm px-4 py-3 mb-6">
            This patient&apos;s record is {patient.status} and is now read-only.
          </div>
        )}

        {canAct && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full items-start">
            {/* LEFT: vitals form */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
              {/* Temperature hero */}
              <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[22px]">device_thermostat</span>
                  <span className="font-headline-sm text-[16px] text-on-surface font-bold">Core Temperature</span>
                  <Badge label="CRITICAL METRIC" tone="bad" />
                </div>

                <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3 sm:p-4 gap-2 sm:gap-4 border border-surface-container-highest/60">
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <StepButton label="-1.0" onClick={() => setTemp((t) => Math.round((t - 1) * 10) / 10)} />
                    <StepButton label="-0.1" onClick={() => setTemp((t) => Math.round((t - 0.1) * 10) / 10)} />
                  </div>
                  <div className="flex flex-col items-center justify-center text-center px-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`font-metric-display text-[48px] sm:text-[60px] leading-none font-extrabold tracking-tight ${cat.tone === "bad" ? "text-error" : "text-on-surface"}`}>
                        {temp.toFixed(1)}
                      </span>
                      <span className="font-headline-lg text-[20px] text-on-surface-variant font-bold ml-1">°F</span>
                    </div>
                    <div className={`flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full ${cat.tone === "bad" ? "bg-error-container/60" : cat.tone === "warn" ? "bg-surface-container" : "bg-secondary-container/60"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${cat.tone === "bad" ? "bg-error animate-ping" : cat.tone === "warn" ? "bg-secondary" : "bg-primary"}`} />
                      <span className={`font-label-md text-[11px] font-extrabold uppercase tracking-wider text-center ${cat.tone === "bad" ? "text-error" : "text-on-surface"}`}>
                        {cat.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <StepButton label="+1.0" onClick={() => setTemp((t) => Math.round((t + 1) * 10) / 10)} />
                    <StepButton label="+0.1" onClick={() => setTemp((t) => Math.round((t + 0.1) * 10) / 10)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-on-surface-variant font-label-sm text-[11px] font-medium">Standard clinical presets:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {TEMP_PRESETS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTemp(t)}
                        className={`h-11 rounded-lg font-label-md text-[13px] font-bold border transition-colors ${
                          t >= 100.4
                            ? "bg-error text-white border-error/20 hover:opacity-90"
                            : t >= 99.5
                              ? "bg-error-container text-on-error-container border-error/20 hover:opacity-90"
                              : "bg-surface-container-low text-on-surface border-surface-container-highest hover:bg-surface-container"
                        }`}
                      >
                        {t.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {cat.tone !== "ok" && (
                  <div className="p-3.5 rounded-xl bg-error-container/70 border border-error/20 text-on-error-container flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[22px] text-error flex-shrink-0 mt-0.5">report</span>
                    <div className="flex flex-col font-body-sm text-[12px]">
                      <span className="font-bold text-error uppercase font-label-md text-[11px] tracking-wide">
                        Fever threshold (≥100.4°F) {cat.tone === "bad" ? "violated" : "approaching"}
                      </span>
                      <p className="mt-0.5 leading-relaxed">
                        {cat.tone === "bad"
                          ? `Committing this reading of ${temp.toFixed(1)}°F will reset ${patient.name.split(" ")[0]}'s fever-free streak to Day 0. Discharge eligibility is postponed.`
                          : `This is a sub-febrile reading — below the fever threshold, so it will not break the streak, but keep an eye on it.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary vitals grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <VitalCard
                  icon="air"
                  iconColor="text-primary"
                  label="SpO2 (Pulse Oximetry)"
                  value={spo2}
                  unit="%"
                  badge={spo2Category(spo2)}
                  onDec={() => setSpo2((v) => Math.max(70, v - 1))}
                  onInc={() => setSpo2((v) => Math.min(100, v + 1))}
                  footer={<Range low="<92% Critical" mid={`${spo2}% current`} high="≥95% Target" />}
                />
                <VitalCard
                  icon="ecg_heart"
                  iconColor="text-error"
                  label="Heart Rate"
                  value={hr}
                  unit="bpm"
                  badge={hrCategory(hr)}
                  onDec={() => setHr((v) => Math.max(40, v - 2))}
                  onInc={() => setHr((v) => Math.min(200, v + 2))}
                  footer={
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-[11px] font-medium pt-1 border-t border-surface-container-highest/60">
                      <span>Resting baseline: {hrBaseline} bpm</span>
                      <span className={hr - hrBaseline > 20 ? "text-error font-bold" : ""}>
                        {hr - hrBaseline >= 0 ? "+" : ""}
                        {hr - hrBaseline} bpm vs baseline
                      </span>
                    </div>
                  }
                />
                <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-on-surface font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-[20px]">speed</span> Blood Pressure
                    </span>
                    <Badge label={bpCategory(bpSys, bpDia).label} tone={bpCategory(bpSys, bpDia).tone} />
                  </div>
                  <div className="flex items-center justify-around py-1">
                    <div className="text-center">
                      <div className="font-label-sm text-[10px] text-on-surface-variant font-bold tracking-wider">SYSTOLIC</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setBpSys((v) => Math.max(70, v - 2))} className="text-on-surface-variant px-1">−</button>
                        <div className="font-metric-display text-[26px] text-on-surface font-extrabold">{bpSys}</div>
                        <button onClick={() => setBpSys((v) => Math.min(220, v + 2))} className="text-on-surface-variant px-1">+</button>
                      </div>
                    </div>
                    <span className="font-headline-xl text-[24px] text-outline-variant font-light">/</span>
                    <div className="text-center">
                      <div className="font-label-sm text-[10px] text-on-surface-variant font-bold tracking-wider">DIASTOLIC</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setBpDia((v) => Math.max(40, v - 2))} className="text-on-surface-variant px-1">−</button>
                        <div className="font-metric-display text-[26px] text-on-surface font-extrabold">{bpDia}</div>
                        <button onClick={() => setBpDia((v) => Math.min(140, v + 2))} className="text-on-surface-variant px-1">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <VitalCard
                  icon="airwave"
                  iconColor="text-tertiary"
                  label="Respiratory Rate"
                  value={rr}
                  unit="/min"
                  badge={rrCategory(rr)}
                  onDec={() => setRr((v) => Math.max(8, v - 1))}
                  onInc={() => setRr((v) => Math.min(45, v + 1))}
                />
              </div>

              {/* AVPU */}
              <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-label-md text-on-surface font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">psychology</span> Neurological Scale (AVPU)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      ["A", "ALERT", "Fully responsive"],
                      ["V", "VOICE", "Responds to vocal"],
                      ["P", "PAIN", "Responds to sternal"],
                      ["U", "UNRESPONSIVE", "No motor response"],
                    ] as const
                  ).map(([code, label, desc]) => (
                    <button
                      key={code}
                      onClick={() => setAvpu(code)}
                      className={`h-12 sm:h-14 py-2 rounded-xl font-label-md text-[12px] font-bold flex flex-col items-center justify-center border shadow-sm transition-colors ${
                        avpu === code
                          ? "bg-primary text-white border-primary"
                          : "bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-highest"
                      }`}
                    >
                      <span>{label} ({code})</span>
                      <span className={`font-label-sm text-[10px] font-normal ${avpu === code ? "opacity-90" : "text-on-surface-variant"}`}>{desc}</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="font-label-sm text-[11px] text-on-surface-variant mr-1 font-medium">Observed signs:</span>
                  {OBSERVED_SIGNS.map((s) => {
                    const on = signs.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setSigns((prev) => (on ? prev.filter((x) => x !== s) : [...prev, s]))}
                        className={`h-8 px-2.5 rounded-full font-label-sm text-[11px] font-medium border flex items-center gap-1 ${
                          on ? "bg-error-container text-on-error-container border-error/20" : "bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-highest"
                        }`}
                      >
                        {on && <span className="material-symbols-outlined text-[14px]">check</span>}
                        {on ? s : `+ ${s}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commit bar */}
              <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => commit(false)}
                    className="h-12 sm:h-14 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-[14px] font-bold flex items-center justify-center gap-2 border border-surface-container-highest transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">assignment_turned_in</span>
                    <span>{committed ? "Committed ✓" : "Commit Vitals Only"}</span>
                  </button>
                  <button
                    onClick={() => setShowEscalation(true)}
                    className="h-12 sm:h-14 rounded-xl bg-error text-white hover:opacity-95 font-label-lg text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-[22px]">crisis_alert</span>
                    <span>Commit &amp; Alert Doctor</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-[11px] pt-1">
                  <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">verified_user</span>
                  <span>Will be logged under {patient.assignedDoctor}&apos;s chart by Nurse (you).</span>
                </div>
              </div>
            </div>

            {/* RIGHT: escalation + history */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6">
              {showEscalation && (
                <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-3.5">
                  <div className="w-full bg-error text-white p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[22px]">emergency</span>
                      <div>
                        <div className="font-headline-sm text-[14px] font-extrabold uppercase tracking-tight">Rapid Physician Escalation</div>
                        <div className="font-label-sm text-[10px] opacity-90">Bed {patient.bed} Priority Alert</div>
                      </div>
                    </div>
                    <Badge label="PRIORITY 1" className="bg-white !text-error" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container-highest">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">person_check</span>
                      </div>
                      <div>
                        <div className="font-label-sm text-[10px] text-primary uppercase font-extrabold tracking-wider">Attending Physician</div>
                        <div className="font-headline-sm text-[14px] text-on-surface font-bold">{patient.assignedDoctor}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="font-label-md text-[12px] text-on-surface font-bold">Select escalation reason:</span>
                    <div className="flex flex-col gap-2">
                      {PAGE_REASONS.map((r) => (
                        <label
                          key={r.value}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest cursor-pointer hover:bg-surface-container"
                        >
                          <input
                            type="radio"
                            name="pageReason"
                            checked={reason === r.value}
                            onChange={() => setReason(r.value)}
                            className="w-4 h-4 accent-error cursor-pointer flex-shrink-0"
                          />
                          <span className="font-label-md text-[12px] text-on-surface font-bold">{r.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="font-label-md text-[12px] text-on-surface font-bold">Nurse observations:</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter clinical context..."
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface font-body-sm text-[12px] focus:outline-none focus:bg-white resize-none"
                    />
                  </div>

                  {pageState === "idle" && (
                    <button
                      onClick={() => commit(true)}
                      className="h-12 w-full rounded-xl bg-error hover:opacity-90 text-white font-headline-sm text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-md"
                    >
                      <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
                      <span>PAGE {patient.assignedDoctor.toUpperCase()} NOW</span>
                    </button>
                  )}
                  {pageState === "paging" && (
                    <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2">
                      <div className="flex items-center justify-between font-label-sm text-[11px]">
                        <span className="text-on-surface-variant font-semibold">Doctor dispatch status:</span>
                        <Badge label="Paging sent • awaiting ACK" tone="bad" />
                      </div>
                      <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: "60%" }} />
                      </div>
                    </div>
                  )}
                  {pageState === "acknowledged" && (
                    <div className="p-3 rounded-xl bg-secondary-container/50 border border-surface-container-highest flex flex-col gap-2">
                      <div className="flex items-center justify-between font-label-sm text-[11px]">
                        <span className="text-on-surface-variant font-semibold">Doctor dispatch status:</span>
                        <Badge label="Acknowledged (ETA 2 min)" tone="ok" />
                      </div>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">
                        <strong>{patient.assignedDoctor} confirmed receipt.</strong> En route to Bed {patient.bed}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* History */}
              <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">history_toggle_off</span>
                    <span className="font-headline-sm text-[15px] text-on-surface font-bold">Bed {patient.bed} · Vitals log</span>
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-low font-semibold">
                    {patient.vitals.length} logged
                  </span>
                </div>
                <div className="flex flex-col divide-y divide-surface-container-highest/60 max-h-80 overflow-y-auto">
                  {[...patient.vitals].reverse().map((v, i) => {
                    const isUndoable = i === 0 && v.date === todayStr();
                    return (
                      <div key={v.id} className="flex items-center justify-between py-2 text-[12px] gap-2">
                        <span className="text-on-surface-variant">
                          {v.date} {v.time}
                        </span>
                        <span className={tempCategory(v.tempF).tone === "bad" ? "text-error font-bold" : "text-on-surface font-semibold"}>
                          {v.tempF}°F
                        </span>
                        <span className="text-on-surface-variant">{v.recordedBy}</span>
                        {isUndoable && (
                          <button
                            onClick={() => {
                              if (confirm("Remove this reading? This is only possible for the most recent entry, same day.")) {
                                deleteVitals(patient.id, v.id);
                              }
                            }}
                            className="text-error text-[11px] font-bold flex items-center gap-0.5 hover:underline flex-shrink-0"
                          >
                            <span className="material-symbols-outlined text-[14px]">undo</span>
                            Undo
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {patient.vitals.length === 0 && <p className="text-on-surface-variant text-sm py-3">No readings yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-12 w-14 sm:w-16 bg-white hover:bg-surface-container active:scale-95 transition-all rounded-xl text-on-surface font-headline-sm text-[16px] font-bold flex items-center justify-center border border-surface-container-highest shadow-sm"
    >
      {label}
    </button>
  );
}

function Range({ low, mid, high }: { low: string; mid: string; high: string }) {
  return (
    <div className="flex justify-between font-label-sm text-[10px] text-on-surface-variant font-medium">
      <span>{low}</span>
      <span>{mid}</span>
      <span>{high}</span>
    </div>
  );
}

function VitalCard({
  icon,
  iconColor,
  label,
  value,
  unit,
  badge,
  onDec,
  onInc,
  footer,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: number;
  unit: string;
  badge: { label: string; tone: "ok" | "warn" | "bad" };
  onDec: () => void;
  onInc: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-container-highest p-4 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <span className="font-label-md text-on-surface font-bold flex items-center gap-1.5">
          <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span> {label}
        </span>
        <Badge label={badge.label} tone={badge.tone} />
      </div>
      <div className="flex items-center justify-between my-1">
        <button
          onClick={onDec}
          className="w-12 h-12 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-95 font-headline-sm text-[18px] font-extrabold flex items-center justify-center text-on-surface border border-surface-container-highest shadow-sm"
        >
          −
        </button>
        <div className="flex items-baseline gap-1">
          <span className="font-metric-display text-[40px] leading-none font-extrabold text-on-surface">{value}</span>
          <span className="font-headline-sm text-[16px] text-on-surface-variant font-bold">{unit}</span>
        </div>
        <button
          onClick={onInc}
          className="w-12 h-12 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-95 font-headline-sm text-[18px] font-extrabold flex items-center justify-center text-on-surface border border-surface-container-highest shadow-sm"
        >
          +
        </button>
      </div>
      {footer}
    </div>
  );
}
