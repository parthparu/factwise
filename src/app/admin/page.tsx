"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { occupancyStats, mortalityStats, activePatients, todayStr, bedTaken } from "@/lib/logic";
import { SUCCESS_BENCHMARK_PCT } from "@/lib/constants";
import { Patient } from "@/lib/types";

export default function AdminPage() {
  const { patients, addPatient, setStatus } = useStore();
  const [showAdmit, setShowAdmit] = useState(false);

  const occ = occupancyStats(patients);
  const mort = mortalityStats(patients);
  const activeEscalations = patients.flatMap((p) => p.pages.filter((pg) => pg.status === "paging")).length;
  const dischargeQueue = patients.filter((p) => p.status === "discharge_pending");
  const active = activePatients(patients).sort((a, b) => a.bed.localeCompare(b.bed));

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
        <p className="font-body-sm text-[13px] text-on-surface-variant mb-6">Facility operations overview.</p>

        <div className="grid sm:grid-cols-5 gap-3 mb-8">
          <Stat label="Occupancy" value={`${occ.occupied} / ${occ.capacity}`} warn={occ.full} />
          <Stat label="Discharged" value={String(mort.discharged)} />
          <Stat label="Deceased" value={String(mort.deceased)} />
          <Stat
            label={`Success rate (≥${SUCCESS_BENCHMARK_PCT}%)`}
            value={mort.successRate === null ? "—" : `${mort.successRate.toFixed(1)}%`}
            warn={mort.meetsBenchmark === false}
          />
          <Stat label="Active escalations" value={String(activeEscalations)} warn={activeEscalations > 0} />
        </div>

        {occ.full && <Banner>Facility is at full capacity — new admissions are blocked until a bed frees up.</Banner>}
        {mort.meetsBenchmark === false && (
          <Banner>Success rate has fallen below the {SUCCESS_BENCHMARK_PCT}% benchmark — flag for the head doctor.</Banner>
        )}

        {dischargeQueue.length > 0 && (
          <Section title="Ready to discharge (doctor-approved)" accent="border-secondary-fixed-dim bg-secondary-container/30">
            {dischargeQueue.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">
                    {p.name} <span className="text-on-surface-variant font-normal">· Bed {p.bed}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant">Admitted {p.admittedDate}</div>
                </div>
                <button
                  onClick={() => setStatus(p.id, "discharged", { dischargedDate: todayStr() })}
                  className="text-sm font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90"
                >
                  Confirm discharge
                </button>
              </div>
            ))}
          </Section>
        )}

        <Section
          title="Active patients"
          accent="border-surface-container-highest bg-white"
          action={
            <button
              onClick={() => setShowAdmit(true)}
              disabled={occ.full}
              className="text-sm font-bold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-40"
            >
              + Admit patient
            </button>
          }
        >
          {active.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                {p.name} · Bed {p.bed}
              </span>
              <span className="text-on-surface-variant">{p.status.replace("_", " ")}</span>
            </div>
          ))}
        </Section>
      </main>

      {showAdmit && (
        <AdmitModal
          patients={patients}
          onClose={() => setShowAdmit(false)}
          onSubmit={(p) => {
            addPatient(p);
            setShowAdmit(false);
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  accent,
  action,
  children,
}: {
  title: string;
  accent: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-on-surface-variant">{title}</h2>
        {action}
      </div>
      <div className={`rounded-xl border divide-y divide-surface-container-highest ${accent}`}>{children}</div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-surface-container-highest bg-white p-3">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className={`text-lg font-bold ${warn ? "text-error" : "text-on-surface"}`}>{value}</div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-error/30 bg-error-container/40 text-on-error-container text-sm px-4 py-3 mb-6">{children}</div>;
}

function AdmitModal({
  patients,
  onClose,
  onSubmit,
}: {
  patients: Patient[];
  onClose: () => void;
  onSubmit: (p: Omit<Patient, "id" | "vitals" | "visits" | "pages" | "status">) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">("Female");
  const [bed, setBed] = useState("");
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
