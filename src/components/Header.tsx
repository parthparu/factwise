"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { occupancyStats } from "@/lib/logic";

const NAV = [
  { href: "/nurse", label: "Nurse Vitals Roster" },
  { href: "/doctor", label: "Doctor Clinical Rounds & Discharge" },
  { href: "/admin", label: "Admin Bed Census & KPI Benchmark" },
];

const ROLE_PERSONA: Record<string, { name: string; sub: string }> = {
  Nurse: { name: "Nurse (you)", sub: "Ward Round · RN" },
  Doctor: { name: "Dr. (you)", sub: "Attending Physician" },
  Admin: { name: "Admin (you)", sub: "Facility Operations" },
};

export default function Header({ role }: { role: string }) {
  const pathname = usePathname();
  const { patients } = useStore();
  const occ = occupancyStats(patients);
  const activePages = patients.flatMap((p) => p.pages.filter((pg) => pg.status === "paging"));
  const persona = ROLE_PERSONA[role] ?? { name: role, sub: "" };

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-surface-container-highest shadow-sm">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between py-2 gap-1.5">
        <div className="flex items-center justify-between w-full h-auto min-h-[48px] gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-white text-[20px]">local_hospital</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-[15px] sm:text-[16px] text-on-surface font-extrabold uppercase tracking-tight whitespace-nowrap">
                    QuaranTrack
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] font-bold tracking-wide whitespace-nowrap">
                    {occ.occupied}/{occ.capacity}-BED ACTIVE
                  </span>
                </div>
                <div className="font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1.5 whitespace-nowrap">
                  <span>FactWise Junior TPM Assessment</span>
                  <span className="text-outline-variant">•</span>
                  <span>Clinical Field Protocol</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block h-7 w-px bg-surface-container-highest" />
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-label-sm text-[11px] text-on-surface font-bold uppercase tracking-wider">Live Monitoring</span>
              </div>
              <div className="flex items-center gap-1 font-label-sm text-[12px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-tertiary">schedule</span>
                <span>Shift: 07:00 – 19:00</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {activePages.length > 0 && (
              <Link
                href="/doctor"
                className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-error-container hover:bg-error-container/80 text-on-error-container cursor-pointer transition-colors"
                title={`${activePages.length} active escalation(s)`}
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-error text-white font-label-sm text-[10px] leading-tight font-bold shadow-sm">
                  {activePages.length}
                </span>
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 pl-1">
              <div className="text-right">
                <div className="font-label-md text-[13px] text-on-surface font-bold leading-tight">{persona.name}</div>
                <div className="font-label-sm text-[10px] text-on-surface-variant">{persona.sub}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>
            <Link
              href="/"
              className="h-9 px-3 flex items-center rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-sm text-[12px] font-semibold transition-colors"
            >
              Switch role
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between w-full border-t border-surface-container-highest/60 pt-1.5 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 sm:gap-1 whitespace-nowrap">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 sm:px-3 py-1 font-label-md text-[12px] sm:text-[13px] rounded-lg transition-colors flex items-center font-medium ${
                    active
                      ? "bg-primary text-white font-bold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:flex items-center gap-1.5 font-label-sm text-[11px] text-on-surface-variant flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Sub-station 2 Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
}
