import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-end gap-2 no-underline text-brew" aria-label="Steep home">
      <span className="display text-[28px] font-extrabold leading-none">Steep</span>
      <span className="mb-[3px] block h-[3px] w-10 bg-amber" aria-hidden="true" />
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const look =
    variant === "primary"
      ? "bg-brew text-cup hover:bg-black"
      : variant === "danger"
        ? "bg-transparent text-brew-soft hover:bg-leaf"
        : "bg-transparent text-brew border border-leaf hover:border-brew";
  return <button className={`${base} ${look} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-leaf bg-cup ${className}`}>{children}</section>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const look = tone === "error" ? "bg-[#FDECEC] text-[#8A1C1C]" : "bg-amber-soft text-brew-soft";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[14px] ${look}`}>
      {children}
    </p>
  );
}

export function Steam() {
  return (
    <span className="steam inline-flex items-end gap-[5px]" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}
