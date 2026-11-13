import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CATEGORIES, TYPES } from "@/lib/api";
import { useZones } from "@/hooks/useConfig";

const ALL = "__all";

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1.5 min-w-0">
    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</span>
    {children}
  </label>
);

const Pick = ({ value, onChange, options, placeholder, testid }) => (
  <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
    <SelectTrigger data-testid={testid} className="h-11 bg-white"><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>{placeholder}</SelectItem>
      {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export const Filters = ({ f, set, full = false }) => {
  const { data: zones = [] } = useZones();
  const types = f.category ? TYPES[f.category] : Object.values(TYPES).flat();
  return (
    <div className={`grid gap-4 grid-cols-2 ${full ? "lg:grid-cols-4" : "md:grid-cols-4"}`}>
      {full && (
        <div className="col-span-2 lg:col-span-4">
          <Field label="Buscar">
            <Input data-testid="filter-search-input" className="h-11 bg-white" placeholder="Ej: quinta con piscina, Toyota..." value={f.q || ""} onChange={(e) => set({ q: e.target.value })} />
          </Field>
        </div>
      )}
      <Field label="Categoría"><Pick testid="filter-category" value={f.category} onChange={(v) => set({ category: v, type: "" })} options={CATEGORIES} placeholder="Todas" /></Field>
      <Field label="Tipo"><Pick testid="filter-type" value={f.type} onChange={(v) => set({ type: v })} options={types} placeholder="Todos" /></Field>
      <Field label="Zona"><Pick testid="filter-zone" value={f.zone} onChange={(v) => set({ zone: v })} options={zones.map((z) => ({ value: z, label: z }))} placeholder="Todas" /></Field>
      <Field label="Moneda"><Pick testid="filter-currency" value={f.currency} onChange={(v) => set({ currency: v })} options={[{ value: "USD", label: "Dólares ($)" }, { value: "Bs", label: "Bolívares (Bs)" }]} placeholder="Cualquiera" /></Field>
      <Field label="Precio mín."><Input data-testid="filter-min-price" type="number" min="0" className="h-11 bg-white" value={f.min_price || ""} onChange={(e) => set({ min_price: e.target.value })} placeholder="0" /></Field>
      <Field label="Precio máx."><Input data-testid="filter-max-price" type="number" min="0" className="h-11 bg-white" value={f.max_price || ""} onChange={(e) => set({ max_price: e.target.value })} placeholder="Sin límite" /></Field>
    </div>
  );
};
