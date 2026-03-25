import { useState, useEffect } from "react";

interface Props {
  expiresAt: string;
  onExpired?: () => void;
}

export default function CountdownTimer({ expiresAt, onExpired }: Props) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (remaining <= 0) {
      onExpired?.();
      return;
    }
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diff / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        onExpired?.();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired, remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 60;

  return (
    <div className={`font-mono text-2xl font-bold tabular-nums ${isUrgent ? "text-destructive" : "text-foreground"}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}
