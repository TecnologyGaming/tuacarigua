import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, LogOut, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, errMsg, formatPrice, imgUrl, typeLabel } from "@/lib/api";
import { ListingForm } from "@/components/ListingForm";

const Stat = ({ label, value, id }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5">
    <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</p>
    <p data-testid={`stat-${id}`} className="mt-1 font-display text-3xl font-extrabold text-[#0B2A5B]">{value ?? "–"}</p>
  </div>
);

const Row = ({ l, onEdit, onDelete, onToggle }) => (
  <div data-testid={`admin-row-${l.id}`} className="flex flex-col md:flex-row md:items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4">
    <img src={imgUrl(l.images?.[0])} alt="" className="w-full md:w-28 h-40 md:h-20 object-cover rounded-xl bg-slate-100" />
    <div className="flex-1 min-w-0">
      <p className="font-display font-bold text-[#0B2A5B] truncate">{l.title}</p>
      <p className="text-xs text-slate-500">{typeLabel(l.type)} · {l.zone} · <b className="text-[#0B2A5B]">{formatPrice(l.price, l.currency)}</b></p>
    </div>
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <Switch data-testid={`toggle-featured-${l.id}`} checked={l.featured} onCheckedChange={(v) => onToggle(l, { featured: v })} /> Destacado
    </label>
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <Switch data-testid={`toggle-sold-${l.id}`} checked={l.sold} onCheckedChange={(v) => onToggle(l, { sold: v })} /> Vendido
    </label>
    <div className="flex gap-1">
      <Button asChild variant="ghost" size="icon"><Link to={`/anuncio/${l.id}`} target="_blank" data-testid={`view-${l.id}`}><ExternalLink className="w-4 h-4" /></Link></Button>
      <Button variant="ghost" size="icon" data-testid={`edit-${l.id}`} onClick={() => onEdit(l)}><Pencil className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" data-testid={`delete-${l.id}`} onClick={() => onDelete(l)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
    </div>
  </div>
);

export default function AdminDashboard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const hasToken = !!localStorage.getItem("tua_admin_token");
  useEffect(() => {
    if (!hasToken) { nav("/admin"); return; }
    api.get("/auth/me").catch(() => { localStorage.removeItem("tua_admin_token"); nav("/admin"); });
  }, [nav, hasToken]);

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: async () => (await api.get("/admin/stats")).data });
  const params = { limit: 200, q: q || undefined, ...(tab === "featured" && { featured: true }), ...(tab === "active" && { hide_sold: true }) };
  const list = useQuery({ queryKey: ["listings", "admin", params], queryFn: async () => (await api.get("/listings", { params })).data });
  const items = tab === "sold" ? list.data?.filter((l) => l.sold) : list.data;

  const refresh = () => { qc.invalidateQueries({ queryKey: ["listings"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); qc.invalidateQueries({ queryKey: ["zones"] }); };
  const toggle = async (l, patch) => {
    try { await api.patch(`/admin/listings/${l.id}`, patch); refresh(); toast.success("Actualizado"); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    try { await api.delete(`/admin/listings/${deleting.id}`); refresh(); toast.success("Anuncio eliminado"); } catch (e) { toast.error(errMsg(e)); }
    setDeleting(null);
  };
  const logout = () => { localStorage.removeItem("tua_admin_token"); nav("/admin"); };
  const s = stats.data || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3"><img src="/logo.webp" alt="" className="h-11" /><span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-[#FF6A00]">Panel admin</span></div>
          <Button data-testid="admin-logout" variant="ghost" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Salir</Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2A5B]">Publicaciones</h1>
          <Button data-testid="admin-new-listing" onClick={() => setEditing({})} className="rounded-full bg-[#FF6A00] hover:bg-[#E05D00] font-bold h-11 px-6"><Plus className="w-4 h-4 mr-2" /> Nueva publicación</Button>
        </div>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat id="total" label="Total" value={s.total} />
          <Stat id="featured" label="Destacados" value={s.featured} />
          <Stat id="sold" label="Vendidos" value={s.sold} />
          <Stat id="inmuebles" label="Inmuebles" value={s.inmuebles} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3 items-center justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger data-testid="tab-all" value="all">Todas</TabsTrigger>
              <TabsTrigger data-testid="tab-active" value="active">Activas</TabsTrigger>
              <TabsTrigger data-testid="tab-sold" value="sold">Vendidas</TabsTrigger>
              <TabsTrigger data-testid="tab-featured" value="featured">Destacadas</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input data-testid="admin-search" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="w-64 bg-white" />
        </div>
        <div className="mt-5 space-y-3">
          {list.isLoading && <p className="text-slate-500">Cargando...</p>}
          {items?.length === 0 && <p data-testid="admin-empty" className="text-slate-500 py-10 text-center">No hay publicaciones.</p>}
          {items?.map((l) => <Row key={l.id} l={l} onEdit={setEditing} onDelete={setDeleting} onToggle={toggle} />)}
        </div>
      </main>
      <ListingForm open={!!editing} initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.title}” se eliminará definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction data-testid="delete-confirm" onClick={remove} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
