export type Role = "nurse" | "doctor" | "admin";

export type AVPU = "A" | "V" | "P" | "U";

export type VitalsReading = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  tempF: number;
  spo2?: number;
  hr?: number; // beats per minute
  rr?: number; // breaths per minute
  bpSys?: number;
  bpDia?: number;
  avpu?: AVPU;
  signs?: string[]; // observed signs, e.g. "Diaphoretic / Chills"
  notes?: string;
  recordedBy: string;
};

export type DoctorVisit = {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  notes?: string;
};

export type PageStatus = "paging" | "acknowledged" | "resolved";

export type PageEvent = {
  id: string;
  date: string;
  time: string;
  reason: string;
  notes?: string;
  raisedBy: string;
  status: PageStatus;
  acknowledgedAt?: string;
};

export type PatientStatus = "active" | "discharge_pending" | "discharged" | "deceased";

export type Patient = {
  id: string;
  name: string;
  age: number;
  sex: "Female" | "Male" | "Other";
  bed: string;
  assignedDoctor: string;
  admittedDate: string;
  admissionNotes?: string;
  status: PatientStatus;
  dischargedDate?: string;
  vitals: VitalsReading[];
  visits: DoctorVisit[];
  pages: PageEvent[];
};
