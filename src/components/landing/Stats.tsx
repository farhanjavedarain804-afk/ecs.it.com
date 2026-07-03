import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 10, suffix: "+", label: "Services" },
  { value: 1000, suffix: "+", label: "Complaints Resolved" },
  { value: 500, suffix: "+", label: "Happy Customers" },
  { value: 24, suffix: "/7", label: "Support" },
];

function useCountUp(target: number, start: boolean, duration = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return n;
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative -mt-12 z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-3xl bg-card shadow-card-soft border border-border p-6 lg:p-8">
          {STATS.map((s) => (
            <StatItem key={s.label} {...s} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, suffix, label, visible }: { value: number; suffix: string; label: string; visible: boolean }) {
  const n = useCountUp(value, visible);
  return (
    <div className="text-center px-2">
      <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gradient-brand">
        {n}{suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground font-medium">{label}</div>
    </div>
  );
}
