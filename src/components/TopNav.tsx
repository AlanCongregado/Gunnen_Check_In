import { Link } from "react-router-dom";
import type { UserRole } from "../lib/types";
import BrandMark from "./BrandMark";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type UserData = {
  name: string;
  email: string;
};

export default function TopNav({
  role,
  onSignOut
}: {
  role: UserRole;
  onSignOut?: () => void;
}) {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("name, email")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserData(data as UserData);
          });
      }
    });
  }, []);

  const athleteLinks = [
    { to: "/athlete", label: "Inicio", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { to: "/reserve", label: "Reservar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { to: "/report-injury", label: "Lesión", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    { to: "/profile", label: "Perfil", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { to: "/scan", label: "Escanear", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
    { to: "/my-reservations", label: "Mis reservas", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" }
  ];

  const coachLinks = [
    { to: "/coach", label: "Panel", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { to: "/coach/classes", label: "Clases", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { to: "/coach/students", label: "Alumnos", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { to: "/profile", label: "Perfil", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { to: "/coach/qr", label: "QR del box", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" }
  ];

  const links = role === "coach" ? coachLinks : athleteLinks;

  const handleLogout = () => {
    try {
      onSignOut?.();
    } finally {
      window.location.href = "/reset";
    }
  };

  return (
    <nav className="fixed lg:left-8 bottom-6 lg:bottom-auto lg:top-1/2 left-1/2 lg:-translate-x-0 -translate-x-1/2 lg:-translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-lg lg:max-w-[80px] group/nav transition-all duration-500 hover:lg:max-w-[200px]">
      <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 lg:border-none rounded-[2rem] lg:rounded-[2.5rem] px-5 py-4 lg:py-8 flex flex-col gap-4 lg:gap-8 backdrop-blur-xl">
        {/* Profile / Header */}
        <div className="flex lg:flex-col items-center justify-between lg:justify-center gap-4 border-b lg:border-none border-gray-100 pb-4 lg:pb-0">
          <div className="flex items-center lg:flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--brand-dark)] to-[var(--brand)] flex items-center justify-center text-white text-xs font-black shadow-lg shadow-[var(--brand)]/20 rotate-3 transition-transform group-hover/nav:rotate-0">
              {userData?.name?.charAt(0) ?? "G"}
            </div>
            <div className="lg:hidden group-hover/nav:lg:block animate-in fade-in slide-in-from-left-2">
              <p className="text-xs font-black text-[var(--brand-dark)] leading-tight">{userData?.name || "Usuario Gunnen"}</p>
              <p className="text-[9px] text-[var(--muted)] font-bold tracking-tight">{userData?.email}</p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-gray-50 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 group/logout"
          >
            <svg className="w-4 h-4 transition-transform group-hover/logout:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <div className="flex lg:flex-col items-center justify-around lg:justify-start gap-x-2 gap-y-3 lg:gap-1 flex-wrap lg:flex-nowrap pb-1 lg:pb-0">
          {links.map((link) => {
            const isActive = window.location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 relative group/link min-w-max lg:w-full ${
                  isActive 
                    ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/10" 
                    : "text-[#5c614b] hover:bg-gray-50 hover:text-[var(--brand-dark)]"
                }`}
              >
                <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${isActive ? "scale-110" : "group-hover/link:scale-110"} transition-transform`}>
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={link.icon} />
                  </svg>
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest whitespace-nowrap lg:hidden group-hover/nav:lg:block animate-in fade-in slide-in-from-left-2`}>
                  {link.label}
                </span>
                
                {isActive && (
                  <div className="absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-1 lg:h-6 bg-[var(--brand-dark)] rounded-full hidden lg:block" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
