"use client";

interface StopImpersonationButtonProps {
  label: string;
}

export function StopImpersonationButton({
  label,
}: StopImpersonationButtonProps) {
  async function handleStop() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleStop}
      className="ml-4 rounded border border-amber-900/30 bg-amber-600 px-3 py-0.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
    >
      {label}
    </button>
  );
}
