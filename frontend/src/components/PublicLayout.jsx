import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";

const NAV = [
  { to: "/buscar?category=inmuebles", label: "Inmuebles", id: "nav-inmuebles" },
  { to: "/buscar?category=vehiculos", label: "Vehículos", id: "nav-vehiculos" },
  { to: "/buscar?category=otros", label: "Otros", id: "nav-otros" },
  { to: "/buscar", label: "Ver todo", id: "nav-todos" },
];

const Header = () => (
  <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/70">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
      <Link to="/" data-testid="header-logo-link" className="shrink-0">
        <img src="/logo.webp" alt="TUACARIGUA.COM" className="h-12 sm:h-14 w-auto" />
      </Link>
      <nav className="hidden md:flex items-center gap-1">
        {NAV.map((n) => (
          <NavLink key={n.id} to={n.to} data-testid={n.id}
            className="px-4 py-2 rounded-full text-sm font-semibold text-[#0B2A5B] hover:bg-[#0B2A5B]/5 transition-colors">
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
    <nav className="md:hidden flex gap-1 overflow-x-auto px-4 pb-3">
      {NAV.map((n) => (
        <NavLink key={n.id} to={n.to} data-testid={`m-${n.id}`}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-[#0B2A5B] whitespace-nowrap">
          {n.label}
        </NavLink>
      ))}
    </nav>
  </header>
);

const Footer = () => {
  const { data } = useConfig();
  return (
    <footer className="bg-[#0B2A5B] text-white mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-3">
        <div>
          <div className="bg-white rounded-2xl p-3 inline-block"><img src="/logo.webp" alt="TUACARIGUA.COM" className="h-12" /></div>
          <p className="mt-4 text-sm text-white/70 max-w-xs">Tu marketplace de inmuebles, vehículos y más en Acarigua y Portuguesa.</p>
        </div>
        <div className="text-sm space-y-2">
          <p className="font-display font-bold text-[#FF6A00] uppercase tracking-wider text-xs">Explorar</p>
          {NAV.map((n) => <Link key={n.id} to={n.to} className="block text-white/80 hover:text-white">{n.label}</Link>)}
        </div>
        <div className="text-sm">
          <p className="font-display font-bold text-[#FF6A00] uppercase tracking-wider text-xs">Contacto</p>
          {data && (
            <a href={`https://wa.me/${data.whatsapp_number}`} target="_blank" rel="noreferrer" data-testid="footer-whatsapp-link"
              className="mt-3 inline-flex items-center gap-2 text-white/90 hover:text-white">
              <MessageCircle className="w-4 h-4" /> +{data.whatsapp_number}
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-white/50 py-5">© {new Date().getFullYear()} TUACARIGUA.COM</div>
    </footer>
  );
};

export default function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
