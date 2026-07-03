'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  refreshAt,
}: {
  label: string;
  targetDate: string | Date;
  caption: string;
  refreshAt?: string | Date | null;
}) {
  const router = useRouter();
  const target = new Date(targetDate).getTime();
  const refreshTarget = refreshAt ? new Date(refreshAt).getTime() : null;
  const refreshedRef = useRef(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (refreshTarget && current >= refreshTarget && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    };

    tick();

    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [refreshTarget, router]);

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
