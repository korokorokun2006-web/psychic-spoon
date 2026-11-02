import { formatDuration } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ExamTimer({
  startedAt,
  durationMin,
  onExpire,
}: {
  startedAt: string;
  durationMin: number;
  onExpire: () => void;
}) {
  const end = new Date(startedAt).getTime() + durationMin * 60 * 1000;
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  useEffect(() => {
    let fired = false;
    const tick = () => {
      const v = Math.max(0, end - Date.now());
      setLeft(v);
      if (v <= 0 && !fired) {
        fired = true;
        onExpire();
      }
    };
    tick();
    const t = window.setInterval(tick, 250);
    return () => window.clearInterval(t);
  }, [end, onExpire]);

  const urgent = left <= 5 * 60 * 1000;
  const warn = left <= 10 * 60 * 1000;
  return (
    <div
      className={
        "tabular-nums rounded-md px-3 py-1.5 text-sm font-semibold " +
        (urgent ? "bg-fail-bg text-fail" : warn ? "bg-warn-bg text-warn" : "bg-paper-2 text-ink")
      }
      aria-live="polite"
    >
      残り {formatDuration(left / 1000)}
    </div>
  );
}
