import { Link } from "react-router-dom";
import { MapPin, BedDouble, Bath, Ruler, Calendar, Gauge, Camera, MessageCircle } from "lucide-react";
import { formatPrice, imgUrl, typeLabel, whatsappLink } from "@/lib/api";
import { useConfig } from "@/hooks/useConfig";

export const Badges = ({ l }) => (
  <div className="absolute top-3 left-3 flex gap-2">
    {l.sold && <span data-testid="badge-vendido" className="bg-red-500 text-white text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md">VENDIDO</span>}
    {l.featured && !l.sold && <span data-testid="badge-destacado" className="bg-[#FF6A00] text-white text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md">DESTACADO</span>}
  </div>
);

export const Specs = ({ l, className = "" }) => {
  const items = [
    l.bedrooms != null && [BedDouble, `${l.bedrooms} hab.`],
    l.bathrooms != null && [Bath, `${l.bathrooms} baños`],
    l.area_m2 != null && [Ruler, `${l.area_m2} m²`],
    l.year != null && [Calendar, l.year],
    l.km != null && [Gauge, `${Number(l.km).toLocaleString("es-VE")} km`],
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 ${className}`}>
      {items.map(([Icon, t], i) => <span key={i} className="inline-flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{t}</span>)}
    </div>
  );
};

export const ListingCard = ({ l, i = 0 }) => {
  const { data: cfg } = useConfig();
  return (
    <article data-testid={`listing-card-${l.id}`} style={{ animationDelay: `${i * 60}ms` }}
      className="fade-up group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-[0_20px_40px_-20px_rgba(11,42,91,0.35)] hover:-translate-y-1 transition-[transform,box-shadow] duration-300 flex flex-col">
      <Link to={`/anuncio/${l.id}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100" data-testid={`listing-card-link-${l.id}`}>
        {l.images?.[0] && <img src={imgUrl(l.images[0])} alt={l.title} loading="lazy"
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${l.sold ? "grayscale-[60%]" : ""}`} />}
        <Badges l={l} />
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] px-2 py-1 rounded-md inline-flex items-center gap-1">
          <Camera className="w-3 h-3" />{l.images?.length || 0}
        </span>
      </Link>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-slate-500">
          <span>{typeLabel(l.type)}</span>
          <span className="inline-flex items-center gap-1 normal-case tracking-normal"><MapPin className="w-3 h-3 text-[#FF6A00]" />{l.zone}</span>
        </div>
        <Link to={`/anuncio/${l.id}`} className="font-display font-bold text-[#0B2A5B] leading-snug line-clamp-2 hover:text-[#FF6A00] transition-colors">{l.title}</Link>
        <Specs l={l} />
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span data-testid={`listing-price-${l.id}`} className="font-display text-xl font-extrabold text-[#0B2A5B]">{formatPrice(l.price, l.currency)}</span>
          {cfg && !l.sold && (
            <a href={whatsappLink(cfg.whatsapp_number, l)} target="_blank" rel="noreferrer" data-testid={`card-whatsapp-${l.id}`}
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold px-3 py-2 rounded-full transition-colors">
              <MessageCircle className="w-4 h-4" /> Preguntar
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export const ListingGrid = ({ items, loading }) => {
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200/60 animate-pulse" />)}</div>;
  if (!items?.length) return <p data-testid="listings-empty" className="text-center text-slate-500 py-20">No encontramos publicaciones con esos filtros.</p>;
  return <div data-testid="listings-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{items.map((l, i) => <ListingCard key={l.id} l={l} i={i} />)}</div>;
};
