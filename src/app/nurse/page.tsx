"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import { useStore } from "@/lib/store";
import { activePatients, measuredToday, latestVitals, tempCategory, isVitalsOverdue } from "@/lib/logic";
import { Patient } from "@/lib/types";

export default function NursePage() {
  const { patients } = useStore();
  const list = activePatients(patients).sort((a, b) => a.bed.localeCompare(b.bed));
  const pendingAll = list.filter((p) => !measuredToday(p));
  const overdue = pendingAll.filter((p) => isVitalsOverdue(p));
  const pending = pendingAll.filter((p) => !isVitalsOverdue(p));
  const done = list.filter((p) => measuredToday(p));
  const spiking = list.filter((p) => {
    const v = latestVitals(p);
    return v && tempCategory(v.tempF).tone === "bad";
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Nurse" />
      <main className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="flex items-center gap-1.5 text-primary mb-1">
          <span className="material-symbols-outlined text-[22px]">medical_services</span>
          <h1 className="font-headline-md text-[20px] sm:text-headline-md font-extrabold tracking-tight text-on-surface">
            Ward Vitals Roster
          </h1>
        </div>
        <p className="font-body-sm text-[13px] text-on-surface-variant mb-6">
          {pendingAll.length} of {list.length} active patients still need today&apos;s vitals recorded.
          {overdue.length > 0 && <span className="text-error font-semibold"> {overdue.length} overdue (past noon, unmeasured).</span>}
          {spiking.length > 0 && <span className="text-error font-semibold"> {spiking.length} patient(s) currently spiking.</span>}
        </p>

        {/* Bed carousel */}
        <div className="flex gap-2.5 sm:gap-3 w-full overflow-x-auto no-scrollbar pb-1 mb-8">
          {list.map((p) => {
            const v = latestVitals(p);
            const cat = v ? tempCategory(v.tempF) : null;
            const spiking = cat?.tone === "bad";
            return (
              <Link
                key={p.id}
                href={`/nurse/${p.id}`}
                className={`flex items-center justify-between p-3 rounded-xl shadow-sm transition-all text-left min-w-[200px] flex-shrink-0 border ${
                  spiking
                    ? "bg-primary text-white border-primary ring-2 ring-primary ring-offset-2"
                    : "bg-white border-surface-container-highest hover:border-primary/50"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-headline-sm text-[14px] font-bold ${spiking ? "text-white" : "text-on-surface"}`}>
                      BED {p.bed}
                    </span>
                    {spiking && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  </div>
                  <div className={`font-body-sm text-[12px] truncate font-medium ${spiking ? "text-white" : "text-on-surface-variant"}`}>
                    {p.name}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end flex-shrink-0">
                  <span className={`font-headline-sm text-[14px] font-bold ${spiking ? "text-white" : "text-on-surface"}`}>
                    {v ? `${v.tempF}°F` : "—"}
                  </span>
                  {cat && (
                    <span
                      className={`font-label-sm text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        spiking ? "bg-error text-white animate-pulse" : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {spiking ? "Spiking" : cat.tone === "warn" ? "Sub-febrile" : "Stable"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {overdue.length > 0 && (
          <Section title="Overdue — no vitals since before noon" accent="border-error/40 bg-error-container/30">
            {overdue.map((p) => (
              <PatientRow key={p.id} patient={p} warn overdue />
            ))}
          </Section>
        )}

        {pending.length > 0 && (
          <Section title="Needs vitals today" accent="border-amber-300 bg-amber-50/60">
            {pending.map((p) => (
              <PatientRow key={p.id} patient={p} warn />
            ))}
          </Section>
        )}

        <Section title="Already recorded today" accent="border-surface-container-highest bg-white">
          {done.length === 0 && <p className="text-sm text-on-surface-variant px-4 py-3">None yet.</p>}
          {done.map((p) => (
            <PatientRow key={p.id} patient={p} warn={false} />
          ))}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-on-surface-variant mb-2">{title}</h2>
      <div className={`rounded-xl border divide-y divide-surface-container-highest ${accent}`}>{children}</div>
    </div>
  );
}

function PatientRow({ patient, warn, overdue }: { patient: Patient; warn: boolean; overdue?: boolean }) {
  const last = [...patient.vitals].slice(-3).reverse();
  return (
    <Link href={`/nurse/${patient.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-container-low">
      <div>
        <div className="font-medium flex items-center gap-2">
          {patient.name} <span className="text-on-surface-variant font-normal">· Bed {patient.bed}</span>
          {overdue ? <Badge label="Overdue" tone="bad" /> : !measuredToday(patient) && <Badge label="No vitals today" tone="warn" />}
        </div>
        <div className="text-xs text-on-surface-variant mt-0.5 flex gap-2 flex-wrap">
          {last.length === 0 && <span>No readings yet</span>}
          {last.map((t) => (
            <span key={t.id} className={tempCategory(t.tempF).tone === "bad" ? "text-error font-medium" : "text-on-surface-variant"}>
              {t.date}: {t.tempF}°F
            </span>
          ))}
        </div>
      </div>
      <span
        className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
          overdue ? "bg-error text-white" : warn ? "bg-primary text-white" : "bg-surface-container-low text-on-surface"
        }`}
      >
        {warn ? "Record vitals" : "Add reading"}
      </span>
    </Link>
  );
}
