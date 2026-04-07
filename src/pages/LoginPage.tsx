import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import logoImg from "@/assets/logo-lajeforro.png";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/",
  PRODUCAO: "/production",
  VENDAS: "/analyses",
  LABORATORIO: "/analyses",
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, profile, session } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error("Preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, senha);
    setLoading(false);

    if (error) {
      if (error.includes("Invalid login credentials")) {
        toast.error("E-mail ou senha incorretos.");
      } else if (error.includes("Email not confirmed")) {
        toast.error("Confirme seu e-mail antes de entrar.");
      } else {
        toast.error("Erro ao entrar: " + error);
      }
      return;
    }

    // O profile é carregado pelo onAuthStateChange no useAuth
    // Aguardar um tick para o estado atualizar
    setTimeout(() => {
      const role = profile?.role ?? "LABORATORIO";
      toast.success("Login realizado com sucesso!");
      navigate(ROLE_HOME[role] || "/");
    }, 300);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-50">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-white border-r border-slate-100 flex-col items-center justify-center p-12">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zm40 0h-1v40h1zM0 0v1h40V0zm0 40v-1h40v1z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Top-left accent bar */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary via-primary/60 to-transparent" />

        <div className="relative z-10 max-w-sm text-center space-y-6">
          <img src={logoImg} alt="Lajeforro" className="h-16 w-auto object-contain mx-auto" />
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Controle Tecnológico<br />de Qualidade
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sistema integrado de análises laboratoriais, granulometria, dosagem e rompimentos de concreto.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["Análises", "Granulometria", "Rompimentos", "Relatórios"].map(f => (
              <span key={f} className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-full uppercase tracking-wide">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom version tag */}
        <div className="absolute bottom-6 text-[11px] text-slate-400">
          v1.0 · Lajeforro Laboratório
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">

          {/* Mobile logo only */}
          <div className="lg:hidden text-center">
            <img src={logoImg} alt="Lajeforro" className="h-12 w-auto object-contain mx-auto mb-2" />
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900">Bom dia 👋</h1>
            <p className="text-slate-500 text-sm">
              {profile?.nome ? `Entrando como ${profile.nome}` : "Entre com suas credenciais para continuar."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 text-sm font-semibold flex items-center gap-1">
                <FlaskConical className="h-3 w-3 text-primary" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 bg-white border-slate-200 focus:border-primary/50 text-slate-900 placeholder:text-slate-400 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-700 text-sm font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showSenha ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={loading}
                  className="h-11 pr-11 bg-white border-slate-200 focus:border-primary/50 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  onClick={() => setShowSenha(!showSenha)}
                >
                  {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-bold tracking-wide gap-2 shadow-md shadow-primary/20 mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verificando...
                </div>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar no Sistema
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-6 text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest">
              Acesso Restrito · Lajeforro Labs
            </p>
            <p className="text-[10px] text-slate-300 mt-1">
              Em caso de problemas, contate o administrador do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
