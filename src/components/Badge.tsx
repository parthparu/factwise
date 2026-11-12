const TONE_CLASSES: Record<string, string> = {
  ok: "bg-secondary-container text-on-secondary-container",
  warn: "bg-surface-container-low border border-surface-container-highest text-on-surface",
  bad: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container-low border border-surface-container-highest text-on-surface-variant",
};

export default function Badge({
  label,
  tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={`px-2 py-0.5 rounded-md font-label-sm text-[11px] font-bold inline-flex items-center ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
