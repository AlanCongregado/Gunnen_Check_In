import React from "react";
import { Link } from "react-router-dom";

interface AestheticHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  onBack?: string; // Path to go back to
}

export default function AestheticHeader({ title, subtitle, badge, onBack }: AestheticHeaderProps) {
  return (
    <header className="space-y-4 animate-fade-in mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {onBack && (
            <Link 
              to={onBack} 
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--brand)] transition-colors mb-2 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Volver
            </Link>
          )}
          <h1 className="text-4xl sm:text-5xl font-normal leading-tight tracking-tight text-[var(--brand-dark)]">
            {title}
          </h1>
        </div>
        {badge && (
          <span className="px-3 py-1 rounded-full badge-soft text-[10px] font-bold uppercase tracking-widest whitespace-nowrap mt-2">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[var(--muted)] text-lg max-w-md leading-relaxed font-light">
          {subtitle}
        </p>
      )}
      <div className="h-0.5 w-16 bg-[var(--brand)] rounded-full opacity-20" />
    </header>
  );
}
