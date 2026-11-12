"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { activePatients, measuredToday, todayStr } from "@/lib/logic";
import { FEVER_THRESHOLD_F } from "@/lib/constants";
import { Patient } from "@/lib/types";

export default function NursePage() {
  const { patients, addTemp } = useStore();
  const [modalPatient, setModalPatient] = useState<Patient | null>(null);

  const list = activePatients(patients).sort((a, b) => a.room.localeCompare(b.room));
  const pending = list.filter((p) => !measuredToday(p));
  const done = list.filter((p) => measuredToday(p));

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Nurse" color="bg-sky-600" />
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <h1 className="text-xl font-semibold mb-1">Daily temperature rounds</h1>
        <p className="text-sm text-slate-500 mb-6">
          {pending.length} of {list.length} active patients still need today&apos;s temperature recorded.
        </p>

        {pending.length > 0 && (
          <Section title="Needs temperature today" accent="border-amber-300 bg-amber-50">
            {pending.map((p) => (
              <PatientRow key={p.id} patient={p} onLog={() => setModalPatient(p)} warn />
            ))}
          </Section>
        )}

        <Section title="Already recorded today" accent="border-slate-200 bg-white">
          {done.length === 0 && <p className="text-sm text-slate-400 px-4 py-3">None yet.</p>}
          {done.map((p) => (
            <PatientRow key={p.id} patient={p} onLog={() => setModalPatient(p)} warn={false} />
          ))}
        </Section>
      </main>

      {modalPatient && (
        <TempModal
          patient={modalPatient}
          onClose={() => setModalPatient(null)}
          onSubmit={(value) => {
            addTemp(modalPatient.id, {
              date: todayStr(),
              time: new Date().toTimeString().slice(0, 5),
              value,
              recordedBy: "Nurse (you)",
            });
            setModalPatient(null);
          }}
        />
      )}
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

function PatientRow({
  patient,
  onLog,
  warn,
}: {
  patient: Patient;
  onLog: () => void;
  warn: boolean;
}) {
  const last = [...patient.temps].slice(-3).reverse();
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <div className="font-medium">
          {patient.name} <span className="text-slate-400 font-normal">· Room {patient.room}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
          {last.length === 0 && <span>No readings yet</span>}
          {last.map((t) => (
            <span
              key={t.id}
              className={
                t.value >= FEVER_THRESHOLD_F ? "text-red-600 font-medium" : "text-slate-500"
              }
            >
              {t.date}: {t.value}°F
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onLog}
        className={`text-sm font-medium px-3 py-1.5 rounded-md ${
          warn ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {warn ? "Record temperature" : "Add another reading"}
      </button>
    </div>
  );
}

function TempModal({
  patient,
  onClose,
  onSubmit,
}: {
  patient: Patient;
  onClose: () => void;
  onSubmit: (value: number) => void;
}) {
  const [value, setValue] = useState("98.6");
  const num = parseFloat(value);
  const valid = !Number.isNaN(num) && num >= 90 && num <= 110;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-lg mb-1">Record temperature</h3>
        <p className="text-sm text-slate-500 mb-4">
          {patient.name} · Room {patient.room}
        </p>
        <label className="text-sm font-medium text-slate-700">Temperature (°F)</label>
        <input
          autoFocus
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-lg"
        />
        {!valid && <p className="text-xs text-red-600 mt-1">Enter a realistic value between 90°F and 110°F.</p>}
        {valid && num >= FEVER_THRESHOLD_F && (
          <p className="text-xs text-red-600 mt-1">⚠ This reading indicates a fever (≥ {FEVER_THRESHOLD_F}°F).</p>
        )}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-slate-700">
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => onSubmit(num)}
            className="flex-1 px-3 py-2 rounded-md bg-sky-600 text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
