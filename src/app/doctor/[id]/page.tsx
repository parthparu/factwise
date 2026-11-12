"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import {
  feverFreeStreak,
  visitedToday,
  measuredToday,
  todayStr,
  isDischargeEligible,
} from "@/lib/logic";
import { FEVER_THRESHOLD_F, DISCHARGE_FEVER_FREE_DAYS } from "@/lib/constants";

export default function DoctorPatientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { patients, addVisit, setStatus } = useStore();
  const [notes, setNotes] = useState("");

  const patient = patients.find((p) => p.id === id);
  if (!patient) {
    return (
      <div className="flex-1 flex flex-col">
        <Header role="Doctor" color="bg-emerald-600" />
        <main className="max-w-3xl mx-auto px-6 py-10">Patient not found.</main>
      </div>
    );
  }

  const { streak, brokenByGap } = feverFreeStreak(patient);
  const eligible = isDischargeEligible(patient);
  const alreadyVisited = visitedToday(patient);
  const hasTempToday = measuredToday(patient);
  const history = [...patient.temps].reverse();
  const canAct = patient.status === "active" || patient.status === "discharge_pending";

  return (
    <div className="flex-1 flex flex-col">
      <Header role="Doctor" color="bg-emerald-600" />
      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex-1">
        <button onClick={() => router.push("/doctor")} className="text-sm text-slate-500 mb-4">
          ← Back to rounds
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{patient.name}</h1>
            <p className="text-slate-500 text-sm">
              Room {patient.room} · Age {patient.age} · Admitted {patient.admittedDate}
            </p>
          </div>
          <StatusBadge status={patient.status} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Stat label="Fever-free streak" value={`${streak} / ${DISCHARGE_FEVER_FREE_DAYS} days`} />
          <Stat label="Today's temp" value={hasTempToday ? "Recorded" : "Not recorded"} warn={!hasTempToday} />
          <Stat label="Visited today" value={alreadyVisited ? "Yes" : "No"} warn={!alreadyVisited} />
        </div>

        {!hasTempToday && canAct && (
          <Banner>No temperature has been logged for this patient today — ask a nurse before finalizing treatment decisions.</Banner>
        )}
        {brokenByGap && (
          <Banner>There is a gap in this patient&apos;s temperature log, so the fever-free streak was reset at the gap.</Banner>
        )}

        {eligible && patient.status === "discharge_pending" && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 mb-6">
            <p className="font-medium text-emerald-800">
              Eligible for discharge — {streak} consecutive fever-free days reported.
            </p>
            <p className="text-sm text-emerald-700 mt-1">
              Approving will notify admin staff to process the discharge.
            </p>
            <button
              onClick={() => setStatus(patient.id, "discharge_pending")}
              className="mt-3 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
              disabled
              title="Already flagged for admin"
            >
              Flagged for admin ✓
            </button>
          </div>
        )}

        {canAct && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6">
            <h2 className="font-medium mb-2">Log today&apos;s visit</h2>
            {alreadyVisited ? (
              <p className="text-sm text-slate-500">Already visited today.</p>
            ) : (
              <>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Treatment notes (optional)"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2"
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
                  className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
                >
                  Mark visited
                </button>
              </>
            )}
          </div>
        )}

        {canAct && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
            <h2 className="font-medium text-red-800 mb-2">Outcome</h2>
            <p className="text-sm text-red-700 mb-2">
              Record if the patient has died, for facility mortality-rate tracking (15% expected, 85% success benchmark).
            </p>
            <button
              onClick={() => {
                if (confirm(`Confirm: mark ${patient.name} as deceased? This cannot be undone.`)) {
                  setStatus(patient.id, "deceased", { dischargedDate: todayStr() });
                }
              }}
              className="text-sm font-medium px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-100"
            >
              Mark as deceased
            </button>
          </div>
        )}

        <div>
          <h2 className="font-medium mb-2">Temperature history</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {history.length === 0 && <p className="text-sm text-slate-400 px-4 py-3">No readings yet.</p>}
            {history.map((t) => (
              <div key={t.id} className="flex justify-between px-4 py-2 text-sm">
                <span>
                  {t.date} {t.time}
                </span>
                <span className={t.value >= FEVER_THRESHOLD_F ? "text-red-600 font-medium" : "text-slate-700"}>
                  {t.value}°F {t.value >= FEVER_THRESHOLD_F ? "(fever)" : ""}
                </span>
                <span className="text-slate-400">{t.recordedBy}</span>
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
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-base font-semibold ${warn ? "text-amber-600" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm px-4 py-3 mb-6">
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-slate-100 text-slate-700",
    discharge_pending: "bg-emerald-100 text-emerald-700",
    discharged: "bg-sky-100 text-sky-700",
    deceased: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${map[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}
