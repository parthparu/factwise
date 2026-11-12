"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Patient, TempReading, DoctorVisit, PatientStatus } from "./types";
import { todayStr, isDischargeEligible } from "./logic";

const STORAGE_KEY = "factwise-quarantine-data-v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function seedPatients(): Patient[] {
  const today = todayStr();
  const d = (n: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - n);
    const pad2 = (x: number) => String(x).padStart(2, "0");
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  };
  return [
    {
      id: uid(),
      name: "Asha Rao",
      age: 34,
      room: "101",
      admittedDate: d(5),
      status: "active",
      temps: [
        { id: uid(), date: d(4), time: "08:00", value: 101.2, recordedBy: "Nurse Jane" },
        { id: uid(), date: d(3), time: "08:00", value: 99.1, recordedBy: "Nurse Jane" },
        { id: uid(), date: d(2), time: "08:10", value: 98.6, recordedBy: "Nurse Jane" },
        { id: uid(), date: d(1), time: "08:05", value: 98.4, recordedBy: "Nurse Jane" },
      ],
      visits: [
        { id: uid(), date: d(4), time: "11:00", doctorName: "Dr. Mehta" },
        { id: uid(), date: d(2), time: "10:30", doctorName: "Dr. Mehta" },
      ],
    },
    {
      id: uid(),
      name: "Imran Khan",
      age: 51,
      room: "102",
      admittedDate: d(6),
      status: "active",
      temps: [
        { id: uid(), date: d(3), time: "09:00", value: 99.9, recordedBy: "Nurse Jane" },
        { id: uid(), date: d(2), time: "09:00", value: 98.2, recordedBy: "Nurse Jane" },
        { id: uid(), date: d(1), time: "09:00", value: 98.1, recordedBy: "Nurse Jane" },
        { id: uid(), date: today, time: "07:45", value: 98.0, recordedBy: "Nurse Jane" },
      ],
      visits: [{ id: uid(), date: d(1), time: "12:00", doctorName: "Dr. Mehta" }],
    },
    {
      id: uid(),
      name: "Sofia Garcia",
      age: 29,
      room: "103",
      admittedDate: d(2),
      status: "active",
      temps: [{ id: uid(), date: d(1), time: "08:30", value: 100.9, recordedBy: "Nurse Jane" }],
      visits: [],
    },
  ];
}

type Store = {
  patients: Patient[];
  addPatient: (p: Omit<Patient, "id" | "temps" | "visits" | "status">) => void;
  addTemp: (patientId: string, reading: Omit<TempReading, "id">) => void;
  addVisit: (patientId: string, visit: Omit<DoctorVisit, "id">) => void;
  setStatus: (patientId: string, status: PatientStatus, extra?: Partial<Patient>) => void;
  reset: () => void;
};

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let next: Patient[];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      next = raw ? JSON.parse(raw) : seedPatients();
    } catch {
      next = seedPatients();
    }
    // Hydrating client-only persisted state after mount (localStorage isn't
    // available during SSR), so a one-time setState here is the correct
    // pattern rather than a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatients(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    } catch {
      // ignore quota errors
    }
  }, [patients, loaded]);

  const api = useMemo<Store>(
    () => ({
      patients,
      addPatient: (p) =>
        setPatients((prev) => [
          ...prev,
          { ...p, id: uid(), status: "active", temps: [], visits: [] },
        ]),
      addTemp: (patientId, reading) =>
        setPatients((prev) =>
          prev.map((p) =>
            p.id === patientId ? { ...p, temps: [...p.temps, { ...reading, id: uid() }] } : p
          )
        ),
      addVisit: (patientId, visit) =>
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id !== patientId) return p;
            const updated = { ...p, visits: [...p.visits, { ...visit, id: uid() }] };
            if (isDischargeEligible(updated) && updated.status === "active") {
              updated.status = "discharge_pending";
            }
            return updated;
          })
        ),
      setStatus: (patientId, status, extra) =>
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? { ...p, status, ...extra } : p))
        ),
      reset: () => setPatients(seedPatients()),
    }),
    [patients]
  );

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
