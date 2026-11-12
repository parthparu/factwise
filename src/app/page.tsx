"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { occupancyStats, mortalityStats } from "@/lib/logic";

const roles = [
  {
    href: "/nurse",
    title: "Nurse",
    desc: "Record daily patient temperatures and view fever history.",
    color: "bg-sky-600",
  },
  {
    href: "/doctor",
    title: "Doctor",
    desc: "Review patients, log visits, and approve discharges based on the 3-day fever-free rule.",
    color: "bg-emerald-600",
  },
  {
    href: "/admin",
    title: "Admin",
    desc: "Manage admissions, room capacity, discharges, and facility performance.",
    color: "bg-amber-600",
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
          <p className="text-sm font-semibold text-sky-600 uppercase tracking-wide">FactWise · Junior TPM Assessment</p>
          <h1 className="text-3xl font-bold mt-2">QuaranTrack</h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">
            Temperature tracking &amp; discharge administration for the quarantine &amp; treatment facility.
            Choose a role to continue.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {roles.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`h-9 w-9 rounded-lg ${r.color} mb-3`} />
              <div className="font-semibold text-lg">{r.title}</div>
              <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
              <div className="text-sm font-medium text-slate-700 mt-3 group-hover:translate-x-1 transition-transform">
                Enter →
              </div>
            </Link>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-slate-500">Occupancy</div>
            <div className="text-xl font-semibold">
              {occ.occupied} / {occ.capacity}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-slate-500">Success rate</div>
            <div className="text-xl font-semibold">
              {mort.successRate === null ? "—" : `${mort.successRate.toFixed(1)}%`}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-slate-500">Benchmark (85%)</div>
            <div className="text-xl font-semibold">
              {mort.meetsBenchmark === null ? "—" : mort.meetsBenchmark ? "On track" : "Below target"}
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => {
              if (confirm("Reset all demo data back to the seeded sample patients?")) reset();
            }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}
