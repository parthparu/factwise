export type Role = "nurse" | "doctor" | "admin";

export type TempReading = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  value: number; // Fahrenheit
  recordedBy: string;
};

export type DoctorVisit = {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  notes?: string;
};

export type PatientStatus = "active" | "discharge_pending" | "discharged" | "deceased";

export type Patient = {
  id: string;
  name: string;
  age: number;
  room: string;
  admittedDate: string;
  status: PatientStatus;
  dischargedDate?: string;
  temps: TempReading[];
  visits: DoctorVisit[];
};
