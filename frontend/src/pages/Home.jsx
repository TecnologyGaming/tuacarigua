import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Home as HomeIcon, Car, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/Filters";
import { ListingGrid } from "@/components/ListingCard";
import { useListings } from "@/hooks/useConfig";

const HERO = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=2000";

const CATS = [
  { k: "inmuebles", label: "Inmuebles", sub: "Casas, apartamentos, terrenos y locales", Icon: HomeIcon },
  { k: "vehiculos", label: "Vehículos", sub: "Carros, camionetas y motos", Icon: Car },
  { k: "otros", label: "Otros", sub: "Electrodomésticos, muebles y más", Icon: Package },
];

const Hero = () => {
  const nav = useNavigate();
  const [f, setF] = useState({});
  const go = () => nav(`/buscar?${new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()}`);
  return (
    <section className="relative hero-grain overflow-hidden bg-[#0B2A5B]">
      <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B2A5B] via-[#0B2A5B]/85 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <p className="fade-up text-xs uppercase tracking-[0.25em] font-bold text-[#FF6A00]">Acarigua · Araure · Portuguesa</p>
        <h1 className="fade-up mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]" style={{ animationDelay: "80ms" }}>
          Compra tu próximo <span className="text-[#FF6A00]">hogar, vehículo</span> o terreno sin complicaciones.
        </h1>
        <p className="fade-up mt-5 max-w-xl text-base md:text-lg text-white/75" style={{ animationDelay: "160ms" }}>
          Publicaciones verificadas y contacto directo por WhatsApp en un solo toque.
        </p>
        <div className="fade-up mt-10 bg-white/95 backdrop-blur-xl rounded-2xl p-5 md:p-6 shadow-2xl max-w-5xl" style={{ animationDelay: "240ms" }}>
          <Filters f={f} set={(p) => setF({ ...f, ...p })} />
          <Button data-testid="hero-search-button" onClick={go} className="mt-5 w-full md:w-auto h-12 px-8 rounded-full bg-[#FF6A00] hover:bg-[#E05D00] text-white font-bold">
            <Search className="w-4 h-4 mr-2" /> Buscar publicaciones
          </Button>
        </div>
      </div>
    </section>
  );
};

const Categories = () => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pt-14 grid gap-4 md:grid-cols-3">
    {CATS.map(({ k, label, sub, Icon }) => (
      <Link key={k} to={`/buscar?category=${k}`} data-testid={`category-card-${k}`}
        className="group flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-200 hover:border-[#FF6A00] transition-colors">
        <span className="w-14 h-14 rounded-xl bg-[#0B2A5B] text-white grid place-items-center group-hover:bg-[#FF6A00] transition-colors"><Icon className="w-6 h-6" /></span>
        <span className="flex-1">
          <span className="block font-display font-bold text-lg text-[#0B2A5B]">{label}</span>
          <span className="block text-sm text-slate-500">{sub}</span>
        </span>
        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#FF6A00] group-hover:translate-x-1 transition-[transform,color]" />
      </Link>
    ))}
  </section>
);

const Section = ({ eyebrow, title, to, children, testid }) => (
  <section data-testid={testid} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20">
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#FF6A00]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A5B]">{title}</h2>
      </div>
      <Link to={to} className="text-sm font-semibold text-[#0B2A5B] hover:text-[#FF6A00] inline-flex items-center gap-1">Ver todos <ArrowRight className="w-4 h-4" /></Link>
    </div>
    {children}
  </section>
);

export default function Home() {
  const featured = useListings({ featured: true, hide_sold: true, limit: 8 });
  const recent = useListings({ limit: 8 });
  return (
    <>
      <Hero />
      <Categories />
      <Section testid="featured-section" eyebrow="Selección especial" title="Anuncios destacados" to="/buscar">
        <ListingGrid items={featured.data} loading={featured.isLoading} />
      </Section>
      <Section testid="recent-section" eyebrow="Lo más nuevo" title="Publicaciones recientes" to="/buscar">
        <ListingGrid items={recent.data} loading={recent.isLoading} />
      </Section>
    </>
  );
}
