'use client';

import { useEffect, useState } from 'react';

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function ExamPreviewCountdown({
  label,
  targetDate,
  caption,
}: {
  label: string;
  targetDate: string | Date;
  caption: string;
}) {
  const target = new Date(targetDate).getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border bg-background p-5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground">
        {formatCountdown(target - now)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}
