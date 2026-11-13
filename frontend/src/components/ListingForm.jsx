import { useEffect, useRef, useState } from "react";
import { X, Upload, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg, imgUrl, CATEGORIES, TYPES } from "@/lib/api";

const EMPTY = { title: "", category: "inmuebles", type: "casa", price: "", currency: "USD", zone: "", description: "", images: [], featured: false, sold: false, bedrooms: "", bathrooms: "", area_m2: "", year: "", km: "", brand: "" };
const NUMS = ["bedrooms", "bathrooms", "area_m2", "year", "km"];

const F = ({ label, children, className = "" }) => (
  <label className={`flex flex-col gap-1.5 ${className}`}><span className="text-xs font-semibold text-slate-600">{label}</span>{children}</label>
);

const Pick = ({ value, onChange, options, testid }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testid}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>
);

const Photos = ({ images, setImages }) => {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (files) => {
    setBusy(true);
    const urls = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try { urls.push((await api.post("/admin/upload", fd)).data.url); } catch (e) { toast.error(`${file.name}: ${errMsg(e)}`); }
    }
    setImages([...images, ...urls]);
    setBusy(false);
    ref.current.value = "";
  };
  const cover = (k) => setImages([images[k], ...images.filter((_, j) => j !== k)]);
  return (
    <div className="sm:col-span-2">
      <span className="text-xs font-semibold text-slate-600">Fotos (la primera es la portada)</span>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {images.map((src, k) => (
          <div key={src + k} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${k === 0 ? "border-[#FF6A00]" : "border-transparent"}`}>
            <img src={imgUrl(src)} alt="" className="w-full h-full object-cover" />
            <button type="button" data-testid={`photo-remove-${k}`} onClick={() => setImages(images.filter((_, j) => j !== k))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center"><X className="w-3 h-3" /></button>
            {k > 0 && <button type="button" data-testid={`photo-cover-${k}`} onClick={() => cover(k)} title="Usar como portada" className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center"><Star className="w-3 h-3" /></button>}
          </div>
        ))}
        <button type="button" data-testid="photo-upload-button" onClick={() => ref.current.click()} disabled={busy}
          className="aspect-square rounded-lg border-2 border-dashed border-slate-300 grid place-items-center text-slate-500 hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex flex-col items-center text-xs gap-1"><Upload className="w-5 h-5" />Subir</span>}
        </button>
      </div>
      <input ref={ref} data-testid="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload([...e.target.files])} />
    </div>
  );
};

export const ListingForm = ({ open, initial, onClose, onSaved }) => {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setF({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ""])) });
  }, [open, initial]);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const isEdit = !!initial?.id;
  const cat = f.category;

  const save = async (e) => {
    e.preventDefault();
    if (!f.images.length) return toast.error("Agrega al menos una foto");
    const body = { ...f, price: Number(f.price) };
    NUMS.forEach((k) => { body[k] = body[k] === "" ? null : Number(body[k]); });
    body.brand = body.brand || null;
    delete body.id; delete body.created_at;
    setSaving(true);
    try {
      if (isEdit) await api.put(`/admin/listings/${initial.id}`, body);
      else await api.post("/admin/listings", body);
      toast.success(isEdit ? "Publicación actualizada" : "Publicación creada");
      onSaved(); onClose();
    } catch (err) { toast.error(errMsg(err)); }
    setSaving(false);
  };

  const num = (k, label) => <F label={label}><Input data-testid={`form-${k}`} type="number" min="0" value={f[k]} onChange={(e) => set({ [k]: e.target.value })} /></F>;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-[#0B2A5B]">{isEdit ? "Editar publicación" : "Nueva publicación"}</DialogTitle></DialogHeader>
        <form onSubmit={save} data-testid="listing-form" className="grid sm:grid-cols-2 gap-4">
          <F label="Título" className="sm:col-span-2"><Input data-testid="form-title" required minLength={3} value={f.title} onChange={(e) => set({ title: e.target.value })} /></F>
          <F label="Categoría"><Pick testid="form-category" value={f.category} onChange={(v) => set({ category: v, type: TYPES[v][0].value })} options={CATEGORIES} /></F>
          <F label="Tipo"><Pick testid="form-type" value={f.type} onChange={(v) => set({ type: v })} options={TYPES[cat]} /></F>
          <F label="Precio"><Input data-testid="form-price" required type="number" min="0" step="any" value={f.price} onChange={(e) => set({ price: e.target.value })} /></F>
          <F label="Moneda"><Pick testid="form-currency" value={f.currency} onChange={(v) => set({ currency: v })} options={[{ value: "USD", label: "Dólares ($)" }, { value: "Bs", label: "Bolívares (Bs)" }]} /></F>
          <F label="Zona / Sector" className="sm:col-span-2"><Input data-testid="form-zone" required placeholder="Ej: Acarigua Norte, Araure, Centro" value={f.zone} onChange={(e) => set({ zone: e.target.value })} /></F>
          {cat === "inmuebles" && <>{num("bedrooms", "Habitaciones")}{num("bathrooms", "Baños")}{num("area_m2", "Área (m²)")}</>}
          {cat === "vehiculos" && <>
            <F label="Marca"><Input data-testid="form-brand" value={f.brand} onChange={(e) => set({ brand: e.target.value })} /></F>
            {num("year", "Año")}{num("km", "Kilometraje")}
          </>}
          <F label="Descripción" className="sm:col-span-2"><Textarea data-testid="form-description" rows={5} value={f.description} onChange={(e) => set({ description: e.target.value })} /></F>
          <Photos images={f.images} setImages={(images) => set({ images })} />
          <label className="flex items-center gap-2 text-sm"><Switch data-testid="form-featured" checked={f.featured} onCheckedChange={(v) => set({ featured: v })} /> Destacar en portada</label>
          <label className="flex items-center gap-2 text-sm"><Switch data-testid="form-sold" checked={f.sold} onCheckedChange={(v) => set({ sold: v })} /> Marcar como vendido</label>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} data-testid="form-cancel">Cancelar</Button>
            <Button data-testid="form-submit" disabled={saving} className="rounded-full bg-[#FF6A00] hover:bg-[#E05D00] font-bold px-6">{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
