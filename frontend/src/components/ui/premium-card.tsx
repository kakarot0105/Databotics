import { ReactNode } from "react";

export interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function PremiumCard({ children, className = "", hover = true }: PremiumCardProps) {
  return (
    <div
      className={`
        glass-card rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6
        ${hover ? "hover-lift" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function PremiumButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`
        gradient-btn rounded-lg px-6 py-3 text-sm font-semibold text-white
        hover:shadow-lg active:scale-95
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export function PremiumBadge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}) {
  const variants = {
    default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <span className={`
      badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium
      ${variants[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
}
