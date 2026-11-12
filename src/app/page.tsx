"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { occupancyStats, mortalityStats } from "@/lib/logic";

const roles = [
  {
    href: "/nurse",
    title: "Nurse",
    desc: "Record full vitals rounds (temp, SpO2, HR, BP, RR, AVPU) and escalate to the attending doctor.",
    icon: "medical_services",
  },
  {
    href: "/doctor",
    title: "Doctor",
    desc: "Review escalations and rounds, and approve discharges based on the 3-day fever-free rule.",
    icon: "stethoscope",
  },
  {
    href: "/admin",
    title: "Admin",
    desc: "Manage admissions, bed capacity, discharges, and facility performance vs the 85% benchmark.",
    icon: "monitoring",
  },
];

export default function Home() {
  const { patients, reset } = useStore();
  const occ = occupancyStats(patients);
  const mort = mortalityStats(patients);

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[22px]">local_hospital</span>
            </div>
          </div>
          <p className="text-sm font-bold text-primary uppercase tracking-wide">FactWise · Junior TPM Assessment</p>
          <h1 className="font-headline-xl text-[32px] sm:text-[36px] font-extrabold text-on-surface mt-2">QuaranTrack</h1>
          <p className="text-on-surface-variant mt-2 max-w-xl mx-auto">
            Clinical vitals tracking &amp; discharge administration for the quarantine &amp; treatment facility. Choose a role to
            continue.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {roles.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group rounded-2xl border border-surface-container-highest bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-white text-[20px]">{r.icon}</span>
              </div>
              <div className="font-bold text-lg text-on-surface">{r.title}</div>
              <p className="text-sm text-on-surface-variant mt-1">{r.desc}</p>
              <div className="text-sm font-bold text-primary mt-3 group-hover:translate-x-1 transition-transform">Enter →</div>
            </Link>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-surface-container-highest bg-white p-4">
            <div className="text-on-surface-variant">Occupancy</div>
            <div className="text-xl font-bold text-on-surface">
              {occ.occupied} / {occ.capacity}
            </div>
          </div>
          <div className="rounded-xl border border-surface-container-highest bg-white p-4">
            <div className="text-on-surface-variant">Success rate</div>
            <div className="text-xl font-bold text-on-surface">{mort.successRate === null ? "—" : `${mort.successRate.toFixed(1)}%`}</div>
          </div>
          <div className="rounded-xl border border-surface-container-highest bg-white p-4">
            <div className="text-on-surface-variant">Benchmark (85%)</div>
            <div className="text-xl font-bold text-on-surface">
              {mort.meetsBenchmark === null ? "—" : mort.meetsBenchmark ? "On track" : "Below target"}
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => {
              if (confirm("Reset all demo data back to the seeded sample patients?")) reset();
            }}
            className="text-xs text-on-surface-variant hover:text-on-surface underline"
          >
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}
