import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("tua_admin_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const imgUrl = (u) => (u && u.startsWith("/api/") ? `${BACKEND_URL}${u}` : u);

export const formatPrice = (price, currency) => {
  const n = Number(price || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 });
  return currency === "Bs" ? `Bs. ${n}` : `$ ${n}`;
};

export const CATEGORIES = [
  { value: "inmuebles", label: "Inmuebles" },
  { value: "vehiculos", label: "Vehículos" },
  { value: "otros", label: "Otros" },
];

export const TYPES = {
  inmuebles: [
    { value: "casa", label: "Casa" },
    { value: "apartamento", label: "Apartamento" },
    { value: "terreno", label: "Terreno" },
    { value: "local", label: "Local comercial" },
    { value: "galpon", label: "Galpón" },
    { value: "finca", label: "Finca" },
  ],
  vehiculos: [
    { value: "carro", label: "Carro" },
    { value: "camioneta", label: "Camioneta" },
    { value: "moto", label: "Moto" },
    { value: "camion", label: "Camión" },
  ],
  otros: [
    { value: "electrodomestico", label: "Electrodoméstico" },
    { value: "mueble", label: "Mueble" },
    { value: "electronica", label: "Electrónica" },
    { value: "otro", label: "Otro" },
  ],
};

export const typeLabel = (t) =>
  Object.values(TYPES).flat().find((x) => x.value === t)?.label || t;

export const whatsappLink = (number, listing) => {
  const url = `${window.location.origin}/anuncio/${listing.id}`;
  const msg = `Hola! Vi este anuncio en TUACARIGUA.COM y quisiera más información:\n*${listing.title}*\nPrecio: ${formatPrice(listing.price, listing.currency)}\nUbicación: ${listing.zone}\nLink: ${url}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
};

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Algo salió mal";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg).filter(Boolean).join(" ");
  return String(d);
};
