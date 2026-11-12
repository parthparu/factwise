"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { occupancyStats, mortalityStats, activePatients, todayStr, roomTaken } from "@/lib/logic";
import { SUCCESS_BENCHMARK_PCT } from "@/lib/constants";
import { Patient } from "@/lib/types";

export default function AdminPage() {
  const { patients, addPatient, setStatus } = useStore();
  const [showAdmit, setShowAdmit] = useState(false);

  const occ = occupancyStats(patients);
  const mort = mortalityStats(patients);
  const dischargeQueue = patients.filter((p) => p.status === "discharge_pending");
  const active = activePatients(patients).sort((a, b) => a.room.localeCompare(b.room));

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Admin" color="bg-amber-600" />
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <h1 className="text-xl font-semibold mb-6">Facility overview</h1>

        <div className="grid sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Occupancy" value={`${occ.occupied} / ${occ.capacity}`} warn={occ.full} />
          <Stat label="Discharged" value={String(mort.discharged)} />
          <Stat label="Deceased" value={String(mort.deceased)} />
          <Stat
            label={`Success rate (≥${SUCCESS_BENCHMARK_PCT}%)`}
            value={mort.successRate === null ? "—" : `${mort.successRate.toFixed(1)}%`}
            warn={mort.meetsBenchmark === false}
          />
        </div>

        {occ.full && <Banner>Facility is at full capacity — new admissions are blocked until a bed frees up.</Banner>}
        {mort.meetsBenchmark === false && (
          <Banner>Success rate has fallen below the {SUCCESS_BENCHMARK_PCT}% benchmark — flag for the head doctor.</Banner>
        )}

        {dischargeQueue.length > 0 && (
          <Section title="Ready to discharge (doctor-approved)" accent="border-emerald-300 bg-emerald-50">
            {dischargeQueue.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">
                    {p.name} <span className="text-slate-400 font-normal">· Room {p.room}</span>
                  </div>
                  <div className="text-xs text-slate-500">Admitted {p.admittedDate}</div>
                </div>
                <button
                  onClick={() => setStatus(p.id, "discharged", { dischargedDate: todayStr() })}
                  className="text-sm font-medium px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Confirm discharge
                </button>
              </div>
            ))}
          </Section>
        )}

        <Section
          title="Active patients"
          accent="border-slate-200 bg-white"
          action={
            <button
              onClick={() => setShowAdmit(true)}
              disabled={occ.full}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-amber-600 text-white disabled:opacity-40"
            >
              + Admit patient
            </button>
          }
        >
          {active.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                {p.name} · Room {p.room}
              </span>
              <span className="text-slate-400">{p.status.replace("_", " ")}</span>
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
        <h2 className="text-sm font-semibold text-slate-600">{title}</h2>
        {action}
      </div>
      <div className={`rounded-lg border divide-y divide-slate-100 ${accent}`}>{children}</div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${warn ? "text-red-600" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 text-sm px-4 py-3 mb-6">{children}</div>
  );
}

function AdmitModal({
  patients,
  onClose,
  onSubmit,
}: {
  patients: Patient[];
  onClose: () => void;
  onSubmit: (p: Omit<Patient, "id" | "temps" | "visits" | "status">) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [room, setRoom] = useState("");

  const ageNum = parseInt(age, 10);
  const errors: string[] = [];
  if (!name.trim()) errors.push("Name is required.");
  if (!age || Number.isNaN(ageNum) || ageNum <= 0) errors.push("Enter a valid age.");
  if (!room.trim()) errors.push("Room number is required.");
  if (room.trim() && roomTaken(patients, room.trim())) errors.push("That room is already occupied.");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-lg mb-4">Admit new patient</h3>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Age">
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input" />
        </Field>
        <Field label="Room">
          <input value={room} onChange={(e) => setRoom(e.target.value)} className="input" />
        </Field>

        {errors.length > 0 && (
          <ul className="text-xs text-red-600 mt-2 list-disc list-inside">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-slate-700">
            Cancel
          </button>
          <button
            disabled={errors.length > 0}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                age: ageNum,
                room: room.trim(),
                admittedDate: todayStr(),
              })
            }
            className="flex-1 px-3 py-2 rounded-md bg-amber-600 text-white disabled:opacity-40"
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
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1 [&_input]:w-full [&_input]:border [&_input]:border-slate-300 [&_input]:rounded-md [&_input]:px-3 [&_input]:py-2">
        {children}
      </div>
    </div>
  );
}
