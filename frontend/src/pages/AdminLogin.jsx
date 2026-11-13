import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errMsg } from "@/lib/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("tua_admin_token", data.token);
      nav("/admin/panel");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#0B2A5B] hero-grain relative px-4">
      <form onSubmit={submit} className="relative fade-up w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <Link to="/"><img src="/logo.webp" alt="TUACARIGUA.COM" className="h-14 mx-auto" /></Link>
        <div className="mt-6 flex items-center gap-2 justify-center text-[#0B2A5B]"><Lock className="w-4 h-4" /><h1 className="font-display font-bold text-xl">Panel administrativo</h1></div>
        <div className="mt-8 space-y-4">
          <Input data-testid="admin-login-email" type="email" required placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
          <Input data-testid="admin-login-password" type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
          {error && <p data-testid="admin-login-error" className="text-sm text-red-600">{error}</p>}
          <Button data-testid="admin-login-submit" disabled={loading} className="w-full h-12 rounded-full bg-[#FF6A00] hover:bg-[#E05D00] font-bold">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
