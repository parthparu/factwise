import Link from "next/link";

export default function Header({ role, color }: { role: string; color: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${color}`} />
          <span className="font-semibold">QuaranTrack</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">{role}</span>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          Switch role
        </Link>
      </div>
    </header>
  );
}
