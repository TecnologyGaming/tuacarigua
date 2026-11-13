import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/Filters";
import { ListingGrid } from "@/components/ListingCard";
import { useListings } from "@/hooks/useConfig";
import { CATEGORIES } from "@/lib/api";

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const f = Object.fromEntries(sp.entries());
  const set = (patch) => {
    const next = { ...f, ...patch };
    setSp(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== "" && v != null)), { replace: true });
  };
  const params = { ...f, sort: f.sort || "recent", hide_sold: f.hide_sold === "1", limit: 200 };
  const { data, isLoading } = useListings(params);
  const title = CATEGORIES.find((c) => c.value === f.category)?.label || "Todas las publicaciones";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#FF6A00]">Explorar</p>
      <h1 data-testid="search-title" className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A5B]">{title}</h1>
      <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <Filters f={f} set={set} full />
        <div className="mt-5 flex flex-wrap items-center gap-4 justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Switch data-testid="filter-hide-sold" checked={f.hide_sold === "1"} onCheckedChange={(v) => set({ hide_sold: v ? "1" : "" })} />
            Ocultar vendidos
          </label>
          <div className="flex items-center gap-3">
            <Select value={f.sort || "recent"} onValueChange={(v) => set({ sort: v })}>
              <SelectTrigger data-testid="filter-sort" className="h-10 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="filter-clear" variant="ghost" onClick={() => setSp({})}>Limpiar</Button>
          </div>
        </div>
      </div>
      <p data-testid="results-count" className="mt-8 mb-5 text-sm text-slate-500">{data ? `${data.length} resultado(s)` : "Cargando..."}</p>
      <ListingGrid items={data} loading={isLoading} />
    </div>
  );
}
