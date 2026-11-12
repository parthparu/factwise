"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { activePatients, visitedToday, measuredToday, feverFreeStreak } from "@/lib/logic";
import { DISCHARGE_FEVER_FREE_DAYS } from "@/lib/constants";
import { Patient } from "@/lib/types";

export default function DoctorPage() {
  const { patients } = useStore();
  const list = activePatients(patients).sort((a, b) => a.room.localeCompare(b.room));

  const dischargeReady = list.filter((p) => p.status === "discharge_pending");
  const notVisited = list.filter((p) => p.status === "active" && !visitedToday(p));
  const visited = list.filter((p) => p.status === "active" && visitedToday(p));

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Doctor" color="bg-emerald-600" />
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <h1 className="text-xl font-semibold mb-1">Rounds &amp; discharge review</h1>
        <p className="text-sm text-slate-500 mb-6">
          {notVisited.length} patients still need a visit today.
        </p>

        {dischargeReady.length > 0 && (
          <Section title="Ready for discharge approval (3 fever-free days)" accent="border-emerald-300 bg-emerald-50">
            {dischargeReady.map((p) => (
              <PatientRow key={p.id} patient={p} />
            ))}
          </Section>
        )}

        <Section title="Not yet visited today" accent="border-amber-300 bg-amber-50">
          {notVisited.length === 0 && <p className="text-sm text-slate-400 px-4 py-3">Everyone has been seen.</p>}
          {notVisited.map((p) => (
            <PatientRow key={p.id} patient={p} />
          ))}
        </Section>

        <Section title="Visited today" accent="border-slate-200 bg-white">
          {visited.length === 0 && <p className="text-sm text-slate-400 px-4 py-3">None yet.</p>}
          {visited.map((p) => (
            <PatientRow key={p.id} patient={p} />
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
      <h2 className="text-sm font-semibold text-slate-600 mb-2">{title}</h2>
      <div className={`rounded-lg border divide-y divide-slate-100 ${accent}`}>{children}</div>
    </div>
  );
}

function PatientRow({ patient }: { patient: Patient }) {
  const { streak } = feverFreeStreak(patient);
  const measured = measuredToday(patient);
  return (
    <Link
      href={`/doctor/${patient.id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
    >
      <div>
        <div className="font-medium">
          {patient.name} <span className="text-slate-400 font-normal">· Room {patient.room}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 flex gap-3 flex-wrap">
          <span>Fever-free streak: {streak}/{DISCHARGE_FEVER_FREE_DAYS}</span>
          {!measured && <span className="text-amber-600">No temp recorded today</span>}
        </div>
      </div>
      <span className="text-sm text-slate-400">View →</span>
    </Link>
  );
}
