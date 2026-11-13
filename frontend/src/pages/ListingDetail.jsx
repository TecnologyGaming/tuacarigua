import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, MessageCircle, ChevronLeft, ChevronRight, Share2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatPrice, imgUrl, typeLabel, whatsappLink, CATEGORIES } from "@/lib/api";
import { useConfig } from "@/hooks/useConfig";
import { Badges, Specs } from "@/components/ListingCard";

const Gallery = ({ l }) => {
  const [i, setI] = useState(0);
  const imgs = l.images || [];
  const n = imgs.length;
  return (
    <div>
      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100">
        {n > 0 && <img data-testid="gallery-main-image" src={imgUrl(imgs[i])} alt={l.title} className="w-full h-full object-cover" />}
        <Badges l={l} />
        {n > 1 && (
          <>
            <button data-testid="gallery-prev" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 grid place-items-center hover:bg-white"><ChevronLeft className="w-5 h-5" /></button>
            <button data-testid="gallery-next" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 grid place-items-center hover:bg-white"><ChevronRight className="w-5 h-5" /></button>
            <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md">{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {imgs.map((src, k) => (
            <button key={k} data-testid={`gallery-thumb-${k}`} onClick={() => setI(k)}
              className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors ${k === i ? "border-[#FF6A00]" : "border-transparent opacity-70"}`}>
              <img src={imgUrl(src)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ContactCard = ({ l }) => {
  const { data: cfg } = useConfig();
  const share = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    toast.success("Enlace copiado");
  };
  return (
    <aside className="lg:sticky lg:top-28 bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">{CATEGORIES.find((c) => c.value === l.category)?.label} · {typeLabel(l.type)}</p>
      <h1 data-testid="detail-title" className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A5B] leading-tight">{l.title}</h1>
      <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600"><MapPin className="w-4 h-4 text-[#FF6A00]" />{l.zone}</p>
      <p data-testid="detail-price" className="mt-5 font-display text-4xl font-extrabold text-[#0B2A5B]">{formatPrice(l.price, l.currency)}</p>
      <Specs l={l} className="mt-4 text-sm" />
      {l.sold ? (
        <div data-testid="detail-sold-notice" className="mt-6 rounded-xl bg-red-50 text-red-600 font-semibold text-center py-4">Este anuncio ya fue vendido</div>
      ) : cfg && (
        <a href={whatsappLink(cfg.whatsapp_number, l)} target="_blank" rel="noreferrer" data-testid="detail-whatsapp-button"
          className="mt-6 flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-4 rounded-full transition-colors">
          <MessageCircle className="w-5 h-5" /> Preguntar por WhatsApp
        </a>
      )}
      <button data-testid="detail-share-button" onClick={share} className="mt-3 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0B2A5B] py-3 rounded-full border border-slate-200 hover:bg-slate-50">
        <Share2 className="w-4 h-4" /> Copiar enlace del anuncio
      </button>
    </aside>
  );
};

export default function ListingDetail() {
  const { id } = useParams();
  const { data: l, isLoading, isError } = useQuery({ queryKey: ["listing", id], queryFn: async () => (await api.get(`/listings/${id}`)).data });
  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-20"><div className="aspect-[16/10] rounded-2xl bg-slate-200 animate-pulse" /></div>;
  if (isError) return <div data-testid="detail-not-found" className="text-center py-32 text-slate-500">Anuncio no encontrado. <Link to="/" className="text-[#FF6A00] font-semibold">Volver al inicio</Link></div>;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link to="/buscar" data-testid="detail-back-link" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#0B2A5B] mb-6"><ArrowLeft className="w-4 h-4" /> Volver a publicaciones</Link>
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <Gallery l={l} />
          <section className="mt-10">
            <h2 className="text-lg font-bold text-[#0B2A5B]">Descripción</h2>
            <p data-testid="detail-description" className="mt-3 text-base leading-relaxed text-slate-700 whitespace-pre-line">{l.description || "Sin descripción."}</p>
            {l.brand && <p className="mt-4 text-sm text-slate-600"><b>Marca:</b> {l.brand}</p>}
          </section>
        </div>
        <ContactCard l={l} />
      </div>
    </div>
  );
}
