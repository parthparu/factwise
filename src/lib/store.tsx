"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Patient, VitalsReading, DoctorVisit, PatientStatus } from "./types";
import { todayStr, isDischargeEligible } from "./logic";

const STORAGE_KEY = "factwise-quarantine-data-v2";

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
      sex: "Female",
      bed: "04",
      assignedDoctor: "Dr. Ananya Krishnan",
      admittedDate: d(5),
      status: "active",
      vitals: [
        { id: uid(), date: d(4), time: "08:00", tempF: 101.2, spo2: 93, hr: 102, rr: 20, bpSys: 128, bpDia: 82, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        { id: uid(), date: d(3), time: "08:00", tempF: 99.1, spo2: 95, hr: 88, rr: 18, bpSys: 122, bpDia: 78, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        { id: uid(), date: d(2), time: "08:10", tempF: 98.6, spo2: 97, hr: 80, rr: 16, bpSys: 118, bpDia: 76, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        { id: uid(), date: d(1), time: "08:05", tempF: 98.4, spo2: 98, hr: 78, rr: 16, bpSys: 116, bpDia: 74, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
      ],
      visits: [
        { id: uid(), date: d(4), time: "11:00", doctorName: "Dr. Ananya Krishnan" },
        { id: uid(), date: d(2), time: "10:30", doctorName: "Dr. Ananya Krishnan" },
      ],
      pages: [],
    },
    {
      id: uid(),
      name: "Imran Khan",
      age: 51,
      sex: "Male",
      bed: "07",
      assignedDoctor: "Dr. Vikram Nair",
      admittedDate: d(6),
      status: "active",
      vitals: [
        { id: uid(), date: d(3), time: "09:00", tempF: 99.9, spo2: 96, hr: 90, rr: 18, bpSys: 124, bpDia: 80, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        { id: uid(), date: d(2), time: "09:00", tempF: 98.2, spo2: 97, hr: 82, rr: 16, bpSys: 120, bpDia: 78, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        { id: uid(), date: d(1), time: "09:00", tempF: 98.1, spo2: 98, hr: 79, rr: 15, bpSys: 118, bpDia: 76, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        { id: uid(), date: today, time: "07:45", tempF: 98.0, spo2: 98, hr: 77, rr: 15, bpSys: 117, bpDia: 75, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
      ],
      visits: [{ id: uid(), date: d(1), time: "12:00", doctorName: "Dr. Vikram Nair" }],
      pages: [],
    },
    {
      id: uid(),
      name: "Meera Iyer",
      age: 29,
      sex: "Female",
      bed: "09",
      assignedDoctor: "Dr. Vikram Nair",
      admittedDate: d(2),
      status: "active",
      vitals: [
        { id: uid(), date: d(1), time: "08:00", tempF: 99.3, spo2: 97, hr: 84, rr: 16, bpSys: 118, bpDia: 76, avpu: "A", recordedBy: "Nurse Priya Deshmukh" },
        {
          id: uid(),
          date: today,
          time: "09:14",
          tempF: 101.5,
          spo2: 94,
          hr: 108,
          rr: 22,
          bpSys: 134,
          bpDia: 88,
          avpu: "A",
          signs: ["Diaphoretic / Chills"],
          notes:
            "Patient shivering violently with rapid temperature rise over 4 hours. Complaining of retrosternal heaviness and moderate dyspnea.",
          recordedBy: "Nurse Ritu Verma, RN",
        },
      ],
      visits: [],
      pages: [
        {
          id: uid(),
          date: today,
          time: "09:15",
          reason: "temp_spike",
          notes: "Rose from 99.3°F to 101.5°F within hours. Visible chills, moderate dyspnea.",
          raisedBy: "Nurse Ritu Verma, RN",
          status: "paging",
        },
      ],
    },
  ];
}

type Store = {
  patients: Patient[];
  addPatient: (
    p: Omit<Patient, "id" | "vitals" | "visits" | "pages" | "status">,
    initialVitals?: Omit<VitalsReading, "id">
  ) => void;
  addVitals: (
    patientId: string,
    reading: Omit<VitalsReading, "id">,
    page?: { reason: string; notes?: string; raisedBy: string }
  ) => void;
  addVisit: (patientId: string, visit: Omit<DoctorVisit, "id">) => void;
  acknowledgePage: (patientId: string, pageId: string, doctorName: string) => void;
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
      addPatient: (p, initialVitals) =>
        setPatients((prev) => [
          ...prev,
          {
            ...p,
            id: uid(),
            status: "active",
            vitals: initialVitals ? [{ ...initialVitals, id: uid() }] : [],
            visits: [],
            pages: [],
          },
        ]),
      addVitals: (patientId, reading, page) =>
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id !== patientId) return p;
            const updated: Patient = { ...p, vitals: [...p.vitals, { ...reading, id: uid() }] };
            if (page) {
              updated.pages = [
                ...updated.pages,
                {
                  id: uid(),
                  date: reading.date,
                  time: reading.time,
                  reason: page.reason,
                  notes: page.notes,
                  raisedBy: page.raisedBy,
                  status: "paging",
                },
              ];
            }
            return updated;
          })
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
      acknowledgePage: (patientId, pageId, doctorName) =>
        setPatients((prev) =>
          prev.map((p) =>
            p.id !== patientId
              ? p
              : {
                  ...p,
                  pages: p.pages.map((pg) =>
                    pg.id === pageId
                      ? { ...pg, status: "acknowledged", acknowledgedAt: `${todayStr()} by ${doctorName}` }
                      : pg
                  ),
                }
          )
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
