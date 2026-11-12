"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Patient, VitalsReading, DoctorVisit, PatientStatus } from "./types";
import { todayStr, isDischargeEligible } from "./logic";

const STORAGE_KEY = "factwise-quarantine-data-v2";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const NURSES = ["Nurse Priya Deshmukh", "Nurse Ritu Verma, RN", "Nurse Kiran Shah"];
const DOCTORS = ["Dr. Ananya Krishnan", "Dr. Vikram Nair", "Dr. Kavya Reddy"];

function seedPatients(): Patient[] {
  const today = todayStr();
  const d = (n: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - n);
    const pad2 = (x: number) => String(x).padStart(2, "0");
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  };

  // Shorthand for a normal-range vitals reading on a given day, with overrides.
  const v = (daysAgo: number, tempF: number, recordedBy: string, extra: Partial<VitalsReading> = {}): VitalsReading => ({
    id: uid(),
    date: daysAgo === 0 ? today : d(daysAgo),
    time: "08:00",
    tempF,
    spo2: 97,
    hr: 78,
    rr: 16,
    bpSys: 118,
    bpDia: 76,
    avpu: "A",
    recordedBy,
    ...extra,
  });
  const visit = (daysAgo: number, doctorName: string, extra: Partial<DoctorVisit> = {}): DoctorVisit => ({
    id: uid(),
    date: daysAgo === 0 ? today : d(daysAgo),
    time: "11:00",
    doctorName,
    ...extra,
  });

  const curated: Patient[] = [
    {
      id: uid(),
      name: "Asha Rao",
      age: 34,
      sex: "Female",
      bed: "04",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(5),
      status: "active",
      vitals: [
        v(4, 101.2, NURSES[0], { spo2: 93, hr: 102, rr: 20, bpSys: 128, bpDia: 82 }),
        v(3, 99.1, NURSES[0], { spo2: 95, hr: 88, rr: 18, bpSys: 122, bpDia: 78 }),
        v(2, 98.6, NURSES[0]),
        v(1, 98.4, NURSES[0], { spo2: 98, hr: 78, bpSys: 116, bpDia: 74 }),
      ],
      visits: [visit(4, DOCTORS[0]), visit(2, DOCTORS[0], { time: "10:30" })],
      pages: [],
    },
    {
      id: uid(),
      name: "Imran Khan",
      age: 51,
      sex: "Male",
      bed: "07",
      assignedDoctor: DOCTORS[1],
      admittedDate: d(6),
      status: "active",
      vitals: [
        v(3, 99.9, NURSES[0], { spo2: 96, hr: 90, rr: 18, bpSys: 124, bpDia: 80 }),
        v(2, 98.2, NURSES[0], { spo2: 97, hr: 82 }),
        v(1, 98.1, NURSES[0], { spo2: 98, hr: 79, rr: 15 }),
        v(0, 98.0, NURSES[0], { spo2: 98, hr: 77, rr: 15, bpSys: 117, bpDia: 75, time: "07:45" }),
      ],
      visits: [visit(1, DOCTORS[1], { time: "12:00" })],
      pages: [],
    },
    {
      id: uid(),
      name: "Meera Iyer",
      age: 29,
      sex: "Female",
      bed: "09",
      assignedDoctor: DOCTORS[1],
      admittedDate: d(2),
      status: "active",
      vitals: [
        v(1, 99.3, NURSES[0], { hr: 84 }),
        v(0, 101.5, NURSES[1], {
          time: "09:14",
          spo2: 94,
          hr: 108,
          rr: 22,
          bpSys: 134,
          bpDia: 88,
          signs: ["Diaphoretic / Chills"],
          notes: "Patient shivering violently with rapid temperature rise over 4 hours. Complaining of retrosternal heaviness and moderate dyspnea.",
        }),
      ],
      visits: [],
      pages: [
        {
          id: uid(),
          date: today,
          time: "09:15",
          reason: "temp_spike",
          notes: "Rose from 99.3°F to 101.5°F within hours. Visible chills, moderate dyspnea.",
          raisedBy: NURSES[1],
          status: "paging",
        },
      ],
    },
    {
      id: uid(),
      name: "Priya Sharma",
      age: 41,
      sex: "Female",
      bed: "02",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(4),
      status: "active",
      vitals: [v(3, 99.8, NURSES[0]), v(2, 98.7, NURSES[0]), v(1, 98.5, NURSES[2]), v(0, 98.3, NURSES[2], { time: "07:30" })],
      visits: [visit(3, DOCTORS[0]), visit(1, DOCTORS[0])],
      pages: [],
    },
    {
      id: uid(),
      name: "Rohan Mehta",
      age: 27,
      sex: "Male",
      bed: "03",
      assignedDoctor: DOCTORS[2],
      admittedDate: today,
      admissionNotes: "Presented with 2 days of fever and body ache.",
      status: "active",
      vitals: [v(0, 99.6, NURSES[2], { time: "09:00" })],
      visits: [],
      pages: [],
    },
    {
      id: uid(),
      name: "Kavya Menon",
      age: 33,
      sex: "Female",
      bed: "05",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(1),
      status: "active",
      vitals: [v(0, 100.9, NURSES[0], { time: "08:30", spo2: 95, hr: 96, signs: ["Productive Cough"] })],
      visits: [],
      pages: [],
    },
    {
      id: uid(),
      name: "Arjun Patel",
      age: 45,
      sex: "Male",
      bed: "06",
      assignedDoctor: DOCTORS[1],
      admittedDate: d(3),
      status: "active",
      vitals: [v(2, 98.9, NURSES[1]), v(1, 98.6, NURSES[1]), v(0, 98.4, NURSES[1], { time: "08:15" })],
      visits: [visit(0, DOCTORS[1], { time: "09:30" })],
      pages: [],
    },
    {
      id: uid(),
      name: "Sneha Joshi",
      age: 38,
      sex: "Female",
      bed: "08",
      assignedDoctor: DOCTORS[2],
      admittedDate: d(3),
      status: "active",
      vitals: [v(2, 99.4, NURSES[2]), v(1, 98.8, NURSES[2])], // nothing logged today — overdue by design
      visits: [visit(1, DOCTORS[2])],
      pages: [],
    },
    {
      id: uid(),
      name: "Vikas Singh",
      age: 56,
      sex: "Male",
      bed: "10",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(4),
      status: "discharge_pending",
      vitals: [v(3, 99.5, NURSES[0]), v(2, 98.4, NURSES[0]), v(1, 98.2, NURSES[0]), v(0, 98.1, NURSES[0], { time: "07:50" })],
      visits: [visit(0, DOCTORS[0], { time: "08:30", notes: "3-day fever-free protocol met. Flagging for admin discharge." })],
      pages: [],
    },
    {
      id: uid(),
      name: "Anjali Gupta",
      age: 24,
      sex: "Female",
      bed: "11",
      assignedDoctor: DOCTORS[1],
      admittedDate: d(4),
      status: "discharge_pending",
      vitals: [v(3, 98.9, NURSES[1]), v(2, 98.3, NURSES[1]), v(1, 98.2, NURSES[1]), v(0, 98.0, NURSES[1], { time: "08:05" })],
      visits: [visit(0, DOCTORS[1], { time: "09:00" })],
      pages: [],
    },
    {
      id: uid(),
      name: "Karan Malhotra",
      age: 49,
      sex: "Male",
      bed: "12",
      assignedDoctor: DOCTORS[2],
      admittedDate: d(2),
      status: "active",
      vitals: [v(1, 100.6, NURSES[2]), v(0, 98.9, NURSES[2], { time: "08:40" })],
      visits: [visit(1, DOCTORS[2])],
      pages: [],
    },
    {
      id: uid(),
      name: "Divya Nair",
      age: 31,
      sex: "Female",
      bed: "13",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(1),
      status: "active",
      vitals: [v(0, 100.7, NURSES[0], { time: "08:20", spo2: 94, hr: 100 })],
      visits: [],
      pages: [],
    },
    {
      id: uid(),
      name: "Siddharth Rao",
      age: 60,
      sex: "Male",
      bed: "14",
      assignedDoctor: DOCTORS[1],
      admittedDate: d(4),
      status: "active",
      vitals: [v(3, 99.2, NURSES[1]), v(2, 98.6, NURSES[1]), v(1, 98.3, NURSES[1]), v(0, 98.2, NURSES[1], { time: "07:55" })],
      visits: [visit(3, DOCTORS[1]), visit(1, DOCTORS[1])],
      pages: [],
    },
    {
      id: uid(),
      name: "Neha Kapoor",
      age: 22,
      sex: "Female",
      bed: "16",
      assignedDoctor: DOCTORS[2],
      admittedDate: today,
      status: "active",
      vitals: [], // just admitted, no reading taken yet
      visits: [],
      pages: [],
    },
    {
      id: uid(),
      name: "Aditya Verma",
      age: 43,
      sex: "Male",
      bed: "17",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(4),
      status: "active",
      vitals: [v(3, 98.8, NURSES[2]), v(2, 98.5, NURSES[2]), v(1, 98.3, NURSES[2]), v(0, 98.2, NURSES[2], { time: "08:10" })],
      visits: [visit(0, DOCTORS[0], { time: "09:10" })],
      pages: [],
    },
    {
      id: uid(),
      name: "Pooja Iyer",
      age: 67,
      sex: "Female",
      bed: "18",
      assignedDoctor: DOCTORS[1],
      admittedDate: d(9),
      status: "deceased",
      dischargedDate: d(2),
      vitals: [v(4, 102.3, NURSES[0]), v(3, 103.1, NURSES[0], { spo2: 88, hr: 118 })],
      visits: [visit(4, DOCTORS[1]), visit(3, DOCTORS[1])],
      pages: [],
    },
    {
      id: uid(),
      name: "Rahul Desai",
      age: 39,
      sex: "Male",
      bed: "19",
      assignedDoctor: DOCTORS[2],
      admittedDate: d(10),
      status: "discharged",
      dischargedDate: d(3),
      vitals: [v(6, 101.0, NURSES[2]), v(5, 99.5, NURSES[2]), v(4, 98.6, NURSES[2]), v(3, 98.2, NURSES[2])],
      visits: [visit(6, DOCTORS[2]), visit(3, DOCTORS[2])],
      pages: [],
    },
    {
      id: uid(),
      name: "Ishita Bose",
      age: 28,
      sex: "Female",
      bed: "20",
      assignedDoctor: DOCTORS[0],
      admittedDate: d(8),
      status: "discharged",
      dischargedDate: d(1),
      vitals: [v(5, 100.8, NURSES[1]), v(4, 99.0, NURSES[1]), v(3, 98.4, NURSES[1]), v(2, 98.1, NURSES[1])],
      visits: [visit(5, DOCTORS[0]), visit(2, DOCTORS[0])],
      pages: [],
    },
  ];

  // Bulk-fill the rest of the ward so occupancy sits around 60% of the
  // 74-bed capacity (~44 beds), spread across all three wings, with a
  // repeating mix of clinical states for a realistic-looking census.
  const BULK_NAMES: { name: string; age: number; sex: "Female" | "Male" }[] = [
    { name: "Nikhil Chawla", age: 36, sex: "Male" },
    { name: "Ritika Bhatt", age: 25, sex: "Female" },
    { name: "Manish Kulkarni", age: 52, sex: "Male" },
    { name: "Tanvi Agarwal", age: 30, sex: "Female" },
    { name: "Suresh Pillai", age: 58, sex: "Male" },
    { name: "Shruti Nambiar", age: 27, sex: "Female" },
    { name: "Deepak Chauhan", age: 44, sex: "Male" },
    { name: "Meenal Deshpande", age: 35, sex: "Female" },
    { name: "Yash Trivedi", age: 23, sex: "Male" },
    { name: "Nikita Saxena", age: 40, sex: "Female" },
    { name: "Harish Bhatia", age: 61, sex: "Male" },
    { name: "Swati Rane", age: 32, sex: "Female" },
    { name: "Mohit Oberoi", age: 48, sex: "Male" },
    { name: "Preeti Chandra", age: 29, sex: "Female" },
    { name: "Gaurav Thakur", age: 37, sex: "Male" },
    { name: "Vidya Subramaniam", age: 55, sex: "Female" },
    { name: "Ankit Bedi", age: 26, sex: "Male" },
    { name: "Lata Khanna", age: 63, sex: "Female" },
    { name: "Sanjay Dutta", age: 46, sex: "Male" },
    { name: "Juhi Sinha", age: 33, sex: "Female" },
    { name: "Vivek Bajaj", age: 50, sex: "Male" },
    { name: "Ira Ganguly", age: 24, sex: "Female" },
    { name: "Naveen Rawat", age: 42, sex: "Male" },
    { name: "Shalini D'Souza", age: 31, sex: "Female" },
    { name: "Rajesh Mittal", age: 57, sex: "Male" },
    { name: "Komal Vyas", age: 28, sex: "Female" },
    { name: "Abhishek Tandon", age: 39, sex: "Male" },
    { name: "Varsha Pandey", age: 47, sex: "Female" },
    { name: "Imtiaz Ansari", age: 34, sex: "Male" },
  ];
  const BULK_BEDS = ["15", "18", "19", "20", "21", "22", "23", "24", "25", ...Array.from({ length: 20 }, (_, i) => String(26 + i))];

  const bulk: Patient[] = BULK_NAMES.map((person, i) => {
    const doctor = DOCTORS[i % DOCTORS.length];
    const nurse = NURSES[i % NURSES.length];
    const pattern = i % 4;
    let vitals: VitalsReading[];
    let status: PatientStatus = "active";

    if (pattern === 0) {
      // Fully fever-free for 3+ days — discharge eligible.
      vitals = [v(3, 98.6, nurse), v(2, 98.4, nurse), v(1, 98.3, nurse), v(0, 98.2, nurse, { time: "07:40" })];
    } else if (pattern === 1) {
      // Active fever spike today.
      vitals = [v(1, 99.4, nurse), v(0, 100.9, nurse, { time: "08:30", spo2: 94, hr: 98 })];
    } else if (pattern === 2) {
      // Overdue — nothing recorded today.
      vitals = [v(2, 99.0, nurse), v(1, 98.6, nurse)];
    } else {
      // Mid-treatment, stable but not yet at the 3-day mark.
      vitals = [v(1, 98.7, nurse), v(0, 98.5, nurse, { time: "08:50" })];
    }

    if (pattern === 0 && i % 8 === 0) status = "discharge_pending";

    return {
      id: uid(),
      name: person.name,
      age: person.age,
      sex: person.sex,
      bed: BULK_BEDS[i],
      assignedDoctor: doctor,
      admittedDate: d(pattern === 2 ? 2 : 3),
      status,
      vitals,
      visits: status === "discharge_pending" || pattern === 0 ? [visit(1, doctor)] : [],
      pages: [],
    };
  });

  return [...curated, ...bulk];
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
  deleteVitals: (patientId: string, vitalsId: string) => void;
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
      deleteVitals: (patientId, vitalsId) =>
        setPatients((prev) =>
          prev.map((p) => (p.id !== patientId ? p : { ...p, vitals: p.vitals.filter((v) => v.id !== vitalsId) }))
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
