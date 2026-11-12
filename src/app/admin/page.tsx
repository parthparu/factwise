"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { occupancyStats, mortalityStats, activePatients, todayStr, bedTaken, latestVitals, tempCategory } from "@/lib/logic";
import { SUCCESS_BENCHMARK_PCT, CAPACITY } from "@/lib/constants";
import { Patient } from "@/lib/types";

const WINGS = [
  { label: "Wing A", sub: "High Acuity Intake & Isolation", range: [1, 25] as const },
  { label: "Wing B", sub: "Intermediate Stabilization", range: [26, 50] as const },
  { label: "Wing C", sub: "Convalescent Clearance", range: [51, 74] as const },
];

type BedStatus = "open" | "stable" | "fever" | "discharge";

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function AdminPage() {
  const { patients, addPatient, setStatus } = useStore();
  const [showAdmit, setShowAdmit] = useState(false);
  const [admitBed, setAdmitBed] = useState<string | undefined>(undefined);

  const occ = occupancyStats(patients);
  const mort = mortalityStats(patients);
  const activeEscalations = patients.flatMap((p) => p.pages.filter((pg) => pg.status === "paging")).length;
  const active = activePatients(patients);

  const occupantByBed = new Map<number, Patient>();
  active.forEach((p) => {
    const n = parseInt(p.bed, 10);
    if (!Number.isNaN(n)) occupantByBed.set(n, p);
  });

  const [selectedBed, setSelectedBed] = useState<number>(() => active[0] ? parseInt(active[0].bed, 10) : 1);
  const selectedOccupant = occupantByBed.get(selectedBed) ?? null;

  function bedStatus(n: number): BedStatus {
    const occ = occupantByBed.get(n);
    if (!occ) return "open";
    if (occ.status === "discharge_pending") return "discharge";
    const v = latestVitals(occ);
    if (v && tempCategory(v.tempF).tone === "bad") return "fever";
    return "stable";
  }

  function exportRosterCSV() {
    const header = ["Bed", "Name", "Age", "Sex", "Assigned Doctor", "Admitted", "Status"];
    const rows = active
      .sort((a, b) => a.bed.localeCompare(b.bed))
      .map((p) => [p.bed, p.name, String(p.age), p.sex, p.assignedDoctor, p.admittedDate, p.status.replace("_", " ")]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadText(`quarantrack-roster-${todayStr()}.csv`, csv, "text/csv");
  }

  function exportDailyReport() {
    const lines = [
      `FeverTrack Daily Facility Report`,
      `Generated: ${todayStr()}`,
      ``,
      `Occupancy: ${occ.occupied} / ${occ.capacity} beds (${occ.remaining} free)`,
      `Discharged: ${mort.discharged}`,
      `Deceased: ${mort.deceased}`,
      `Success rate: ${mort.successRate === null ? "n/a" : mort.successRate.toFixed(1) + "%"} (benchmark ${SUCCESS_BENCHMARK_PCT}%, ${mort.meetsBenchmark ? "met" : "not met"})`,
      `Active escalations: ${activeEscalations}`,
      ``,
      `Active patients:`,
      ...active
        .sort((a, b) => a.bed.localeCompare(b.bed))
        .map((p) => `  Bed ${p.bed} — ${p.name} (${p.sex}, ${p.age}) — ${p.assignedDoctor} — ${p.status.replace("_", " ")}`),
    ];
    downloadText(`quarantrack-daily-report-${todayStr()}.txt`, lines.join("\n"), "text/plain");
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Admin" />
      <main className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="flex items-center gap-1.5 text-primary mb-1">
          <span className="material-symbols-outlined text-[22px]">monitoring</span>
          <h1 className="font-headline-md text-[20px] sm:text-headline-md font-extrabold tracking-tight text-on-surface">
            Bed Census &amp; KPI Benchmark
          </h1>
        </div>
        <p className="font-body-sm text-[13px] text-on-surface-variant mb-6">Facility-wide isolation ward operations.</p>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="Clinical Efficacy Target"
            title="Survival ratio"
            value={mort.successRate === null ? "—" : `${mort.successRate.toFixed(1)}%`}
            sub={`vs ${SUCCESS_BENCHMARK_PCT}.0% min standard`}
            tone={mort.meetsBenchmark === false ? "bad" : "ok"}
            footer={`${mort.discharged} discharged / ${mort.deceased} deceased`}
            progress={mort.successRate ?? undefined}
            threshold={SUCCESS_BENCHMARK_PCT}
          />
          <KpiCard
            label="Real-time Census"
            title="Facility utilization"
            value={`${occ.occupied}/${occ.capacity}`}
            sub="Beds active"
            tone={occ.full ? "bad" : occ.occupied / occ.capacity > 0.9 ? "warn" : "ok"}
            footer={`${occ.remaining} beds free`}
            progress={(occ.occupied / occ.capacity) * 100}
          />
          <KpiCard
            label="Bio-Throughput"
            title="Cleared for discharge"
            value={String(active.filter((p) => p.status === "discharge_pending").length)}
            sub="In admin pipeline"
            tone="ok"
            footer="Doctor-approved, awaiting bed release"
          />
          <KpiCard
            label="Clinical Alerts"
            title="Active escalations"
            value={String(activeEscalations)}
            sub="Nurse → doctor pages open"
            tone={activeEscalations > 0 ? "bad" : "ok"}
            footer={activeEscalations > 0 ? "Awaiting physician acknowledgment" : "No open escalations"}
          />
        </div>

        {occ.full && <Banner>Facility is at full capacity — new admissions are blocked until a bed frees up.</Banner>}
        {mort.meetsBenchmark === false && (
          <Banner>Success rate has fallen below the {SUCCESS_BENCHMARK_PCT}% benchmark — flag for the head doctor.</Banner>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Floor matrix */}
          <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-surface-container-highest flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-headline-sm text-[16px] text-on-surface font-bold">{CAPACITY}-Bed Floor Map</h2>
              <div className="flex flex-wrap items-center gap-3 font-label-sm text-[11px] text-on-surface-variant">
                <LegendDot color="bg-error" label="Fever spike" />
                <LegendDot color="bg-primary" label="Stable" />
                <LegendDot color="bg-secondary-fixed-dim" label="Discharge cleared" />
                <LegendDot color="bg-surface-container-highest" label="Open bed" />
              </div>
            </div>

            {WINGS.map((wing) => (
              <div key={wing.label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 border-b border-surface-container-highest pb-1">
                  <span className="px-2 py-0.5 rounded bg-primary text-white font-label-sm text-[10px] font-bold">{wing.label}</span>
                  <span className="font-body-sm text-[12px] text-on-surface-variant">
                    {wing.sub} · Beds {wing.range[0]}–{wing.range[1]}
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {Array.from({ length: wing.range[1] - wing.range[0] + 1 }, (_, i) => wing.range[0] + i).map((n) => {
                    const status = bedStatus(n);
                    const occ = occupantByBed.get(n);
                    const v = occ ? latestVitals(occ) : null;
                    const doctorLabel = occ ? "Dr. " + occ.assignedDoctor.split(" ").pop() : null;
                    return (
                      <button
                        key={n}
                        onClick={() => setSelectedBed(n)}
                        title={occ ? `Bed ${n}: ${occ.name} — ${status}` : `Bed ${n}: open`}
                        className={`h-16 rounded-lg p-1.5 flex flex-col justify-between items-center shadow-sm transition-all hover:scale-[1.03] ${
                          selectedBed === n ? "ring-2 ring-primary ring-offset-1" : ""
                        } ${
                          status === "fever"
                            ? "bg-error text-white"
                            : status === "discharge"
                              ? "bg-secondary-fixed-dim text-on-secondary-fixed"
                              : status === "stable"
                                ? "bg-primary-container text-white"
                                : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        <span className="font-label-sm text-[10px] font-bold opacity-90">{n < 10 ? `0${n}` : n}</span>
                        {occ ? (
                          <>
                            <span className="font-label-sm text-[9px] font-semibold leading-tight truncate w-full text-center">{doctorLabel}</span>
                            <span className="font-label-sm text-[9px] font-mono bg-black/15 px-1 rounded">
                              {status === "fever" ? `${v?.tempF}°F` : status === "discharge" ? "cleared" : v?.spo2 != null ? `${v.spo2}%` : "—"}
                            </span>
                          </>
                        ) : (
                          <span className="font-label-sm text-[9px]">Open</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: inspector + directives */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-surface-container-highest flex flex-col gap-3">
              {selectedOccupant ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">Bed {selectedOccupant.bed}</span>
                      <h3 className="font-headline-sm text-[15px] text-on-surface font-bold">{selectedOccupant.name}</h3>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">
                        {selectedOccupant.sex}, {selectedOccupant.age} · {selectedOccupant.assignedDoctor}
                      </p>
                    </div>
                    <StatusPill status={bedStatus(selectedBed)} />
                  </div>
                  {latestVitals(selectedOccupant) && (
                    <div className="p-2.5 rounded-lg bg-surface-container-low font-label-sm text-[12px] text-on-surface-variant">
                      Temp {latestVitals(selectedOccupant)!.tempF}°F · SpO2 {latestVitals(selectedOccupant)!.spo2 ?? "—"}% · HR{" "}
                      {latestVitals(selectedOccupant)!.hr ?? "—"} bpm
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pt-1">
                    {selectedOccupant.status === "discharge_pending" && (
                      <button
                        onClick={() => setStatus(selectedOccupant.id, "discharged", { dischargedDate: todayStr() })}
                        className="w-full h-10 rounded-lg bg-primary text-white font-bold text-[13px] flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        Confirm Discharge & Release Bed
                      </button>
                    )}
                    <a
                      href={`/doctor/${selectedOccupant.id}`}
                      className="w-full h-10 rounded-lg bg-surface-container text-on-surface font-semibold text-[13px] flex items-center justify-center gap-2 border border-surface-container-highest"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
                      Open Clinical Chart
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-[12px]">
                      {selectedBed < 10 ? `0${selectedBed}` : selectedBed}
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-[15px] text-on-surface font-bold">Bed {selectedBed} — Open</h3>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">Ready for admission.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAdmitBed(String(selectedBed).padStart(2, "0"));
                      setShowAdmit(true);
                    }}
                    disabled={occ.full}
                    className="w-full h-10 rounded-lg bg-primary text-white font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Admit to Bed {selectedBed}
                  </button>
                </>
              )}
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-surface-container-highest flex flex-col gap-2.5">
              <h3 className="font-headline-sm text-[14px] text-on-surface font-bold border-b border-surface-container-highest pb-2 mb-1">
                Administrative Directives
              </h3>
              <button
                onClick={() => {
                  setAdmitBed(undefined);
                  setShowAdmit(true);
                }}
                disabled={occ.full}
                className="w-full h-11 px-3 rounded-lg bg-primary text-white font-bold text-[13px] flex items-center justify-between disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Admit Patient
                </span>
              </button>
              <button
                onClick={exportDailyReport}
                className="w-full h-11 px-3 rounded-lg bg-surface-container text-on-surface font-semibold text-[13px] flex items-center justify-between border border-surface-container-highest"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">assessment</span>
                  Generate Daily Report
                </span>
                <span className="material-symbols-outlined text-[18px] text-tertiary">download</span>
              </button>
              <button
                onClick={exportRosterCSV}
                className="w-full h-11 px-3 rounded-lg bg-surface-container text-on-surface font-semibold text-[13px] flex items-center justify-between border border-surface-container-highest"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">cloud_upload</span>
                  Export Roster (CSV)
                </span>
                <span className="material-symbols-outlined text-[18px] text-tertiary">download</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {showAdmit && (
        <AdmitModal
          patients={patients}
          initialBed={admitBed}
          onClose={() => setShowAdmit(false)}
          onSubmit={(p) => {
            addPatient(p);
            setSelectedBed(parseInt(p.bed, 10) || selectedBed);
            setShowAdmit(false);
          }}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  title,
  value,
  sub,
  tone,
  footer,
  progress,
  threshold,
}: {
  label: string;
  title: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "bad";
  footer: string;
  progress?: number;
  threshold?: number;
}) {
  const valueColor = tone === "bad" ? "text-error" : tone === "warn" ? "text-on-surface" : "text-primary";
  const barColor = tone === "bad" ? "bg-error" : "bg-primary";
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between h-36">
      <div>
        <span className="font-label-sm text-[10px] text-tertiary uppercase tracking-wider block">{label}</span>
        <span className="font-headline-sm text-[14px] text-on-surface font-bold">{title}</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`font-metric-display text-[26px] font-extrabold ${valueColor}`}>{value}</span>
          <span className="font-label-sm text-[10px] text-on-surface-variant">{sub}</span>
        </div>
        {progress != null && (
          <div className="relative w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mt-2">
            <div className={`absolute left-0 top-0 bottom-0 ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, progress)}%` }} />
            {threshold != null && <div className="absolute top-0 bottom-0 w-0.5 bg-on-surface/40" style={{ left: `${threshold}%` }} />}
          </div>
        )}
      </div>
      <div className="text-on-surface-variant font-label-sm text-[10px] border-t border-surface-container-highest pt-1.5">{footer}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: BedStatus }) {
  const map: Record<BedStatus, { label: string; cls: string }> = {
    fever: { label: "Fever Spike", cls: "bg-error-container text-on-error-container" },
    discharge: { label: "Discharge Cleared", cls: "bg-secondary-container text-on-secondary-container" },
    stable: { label: "Stable", cls: "bg-primary-container text-white" },
    open: { label: "Open", cls: "bg-surface-container-highest text-on-surface-variant" },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-error/30 bg-error-container/40 text-on-error-container text-sm px-4 py-3 mb-6">{children}</div>;
}

function AdmitModal({
  patients,
  initialBed,
  onClose,
  onSubmit,
}: {
  patients: Patient[];
  initialBed?: string;
  onClose: () => void;
  onSubmit: (p: Omit<Patient, "id" | "vitals" | "visits" | "pages" | "status">) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">("Female");
  const [bed, setBed] = useState(initialBed ?? "");
  const [assignedDoctor, setAssignedDoctor] = useState("");

  const ageNum = parseInt(age, 10);
  const errors: string[] = [];
  if (!name.trim()) errors.push("Name is required.");
  if (!age || Number.isNaN(ageNum) || ageNum <= 0) errors.push("Enter a valid age.");
  if (!bed.trim()) errors.push("Bed number is required.");
  if (bed.trim() && bedTaken(patients, bed.trim())) errors.push("That bed is already occupied.");
  if (!assignedDoctor.trim()) errors.push("Assigned doctor is required.");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-lg mb-4">Admit new patient</h3>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Age">
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input" />
        </Field>
        <Field label="Sex">
          <select value={sex} onChange={(e) => setSex(e.target.value as "Female" | "Male" | "Other")} className="input">
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Bed">
          <input value={bed} onChange={(e) => setBed(e.target.value)} className="input" />
        </Field>
        <Field label="Assigned doctor">
          <input value={assignedDoctor} onChange={(e) => setAssignedDoctor(e.target.value)} className="input" placeholder="Dr. ..." />
        </Field>

        {errors.length > 0 && (
          <ul className="text-xs text-error mt-2 list-disc list-inside">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg border border-surface-container-highest text-on-surface">
            Cancel
          </button>
          <button
            disabled={errors.length > 0}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                age: ageNum,
                sex,
                bed: bed.trim(),
                assignedDoctor: assignedDoctor.trim(),
                admittedDate: todayStr(),
              })
            }
            className="flex-1 px-3 py-2 rounded-lg bg-primary text-white disabled:opacity-40"
          >
            Admit
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-sm font-medium text-on-surface">{label}</label>
      <div className="mt-1 [&_input]:w-full [&_input]:border [&_input]:border-surface-container-highest [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:border [&_select]:border-surface-container-highest [&_select]:rounded-lg [&_select]:px-3 [&_select]:py-2">
        {children}
      </div>
    </div>
  );
}
