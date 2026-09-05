import { useEffect, useRef, useState } from "react";

/** Shows a fixed-width document (an email) scaled down to fit its container. */
export function ScaledFrame({ src, title, docWidth = 600, height = 720, className = "" }: { src: string; title: string; docWidth?: number; height?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / docWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [docWidth]);
  return (
    <div ref={ref} className={`relative w-full min-w-0 overflow-hidden ${className}`} style={{ height }}>
      <iframe
        title={title}
        src={src}
        loading="lazy"
        style={{ width: docWidth, height: height / scale, transform: `scale(${scale})`, transformOrigin: "top left", border: 0, display: "block" }}
      />
    </div>
  );
}
