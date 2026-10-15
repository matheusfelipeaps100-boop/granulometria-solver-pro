import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
  LineChart, Line, ReferenceLine, PieChart, Pie, Cell,
} from "recharts";
import { useProduction } from "@/hooks/api/useProduction";
import { generatePistaMetricsExcel } from "@/lib/excel-generator";

const FIO_COLORS = ["hsl(var(--chart-primary))", "hsl(var(--chart-amber))", "hsl(var(--chart-green))", "hsl(var(--chart-primary-light))"];

const fmt = (n: number, digits = 2) => n.toFixed(digits).replace(".", ",");
const fmtDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const monthStartEnd = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
    to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(last)}`,
  };
};

const PistaMetricsPage = () => {
  const { batches } = useProduction();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pistaFilter, setPistaFilter] = useState("todas");
  const [fiosFilter, setFiosFilter] = useState("todos");

  // Concretagens de pista = lotes de laje com pista informada
  const concretagens = useMemo(
    () => batches.filter((b) => b.analyses?.tipo === "laje" && !!b.pista),
    [batches]
  );

  const pistaOptions = useMemo(
    () => Array.from(new Set(concretagens.map((b) => b.pista as string))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [concretagens]
  );
  const fiosOptions = useMemo(
    () => Array.from(new Set(concretagens.map((b) => b.fios).filter((f): f is number => f != null))).sort((a, b) => a - b),
    [concretagens]
  );

  const filtered = useMemo(
    () =>
      concretagens
        .filter((b) => {
          const day = b.produced_at.slice(0, 10);
          if (from && day < from) return false;
          if (to && day > to) return false;
          if (pistaFilter !== "todas" && b.pista !== pistaFilter) return false;
          if (fiosFilter !== "todos" && String(b.fios) !== fiosFilter) return false;
          return true;
        })
        .sort((a, b) => a.produced_at.localeCompare(b.produced_at)),
    [concretagens, from, to, pistaFilter, fiosFilter]
  );

  const stats = useMemo(() => {
    const volume = filtered.reduce((s, b) => s + (Number(b.volume_concreto_m3) || 0), 0);
    const perda = filtered.reduce((s, b) => s + (Number(b.metros_perda) || 0), 0);
    // % ponderada pelo comprimento: só entram lotes que têm o comprimento informado
    const comAmostra = filtered.filter((b) => Number(b.comprimento_pista_m) > 0);
    const comp = comAmostra.reduce((s, b) => s + Number(b.comprimento_pista_m), 0);
    const perdaComp = comAmostra.reduce((s, b) => s + (Number(b.metros_perda) || 0), 0);
    const perdaPct = comp > 0 ? (perdaComp / comp) * 100 : 0;
    const porFio = new Map<number, number>();
    filtered.forEach((b) => b.fios != null && porFio.set(b.fios, (porFio.get(b.fios) ?? 0) + 1));
    return { volume, perda, perdaPct, aprovPct: comp > 0 ? 100 - perdaPct : 0, hasPct: comp > 0, porFio };
  }, [filtered]);

  const fiosData = useMemo(
    () => Array.from(stats.porFio.entries()).sort((a, b) => a[0] - b[0]).map(([fios, qtd]) => ({ name: `${fios} fios`, value: qtd })),
    [stats.porFio]
  );

  const comparativoPistas = useMemo(() => {
    const map = new Map<string, { perda: number; comp: number }>();
    filtered.forEach((b) => {
      if (!(Number(b.comprimento_pista_m) > 0)) return;
      const cur = map.get(b.pista as string) ?? { perda: 0, comp: 0 };
      cur.perda += Number(b.metros_perda) || 0;
      cur.comp += Number(b.comprimento_pista_m);
      map.set(b.pista as string, cur);
    });
    return Array.from(map.entries())
      .map(([pista, v]) => ({ pista, perda: Math.round((v.perda / v.comp) * 10000) / 100 }))
      .sort((a, b) => a.pista.localeCompare(b.pista, "pt-BR"));
  }, [filtered]);

  const evolucao = useMemo(
    () => filtered.map((b) => ({ data: fmtDate(b.produced_at).slice(0, 5), perda: Number(b.perda_pct) || 0 })),
    [filtered]
  );

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("Não há concretagens no período para exportar.");
      return;
    }
    try {
      await generatePistaMetricsExcel(
        filtered.map((b) => ({
          data: fmtDate(b.produced_at),
          lote: b.batch_code,
          pista: b.pista as string,
          fios: b.fios ?? null,
          volume_m3: Number(b.volume_concreto_m3) || 0,
          metros_perda: Number(b.metros_perda) || 0,
          perda_pct: Number(b.perda_pct) || 0,
          aproveitamento_pct: Number(b.aproveitamento_pct) || 0,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar Excel.");
    }
  };

  const kpis = [
    {
      label: "Qtd. de Pistas",
      value: String(filtered.length),
      sub: fiosData.length ? fiosData.map((f) => `${f.name.replace(" fios", "")} fios: ${f.value}`).join(" · ") : "",
    },
    { label: "Volume de Concreto", value: `${fmt(stats.volume, 1)} m³` },
    { label: "Metros de Perda", value: `${fmt(stats.perda)} m` },
    { label: "% Perda", value: stats.hasPct ? `${fmt(stats.perdaPct, 3)}%` : "—" },
    { label: "% Aproveitamento", value: stats.hasPct ? `${fmt(stats.aprovPct, 3)}%` : "—" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Métricas de Pista</h1>
          <p className="text-sm text-muted-foreground">
            Eficiência das concretagens de pista: perda e aproveitamento no período.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pista</Label>
              <Select value={pistaFilter} onValueChange={setPistaFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {pistaOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fios</Label>
              <Select value={fiosFilter} onValueChange={setFiosFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {fiosOptions.map((f) => <SelectItem key={f} value={String(f)}>{f} fios</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { const m = monthStartEnd(); setFrom(m.from); setTo(m.to); }}>
                Mês atual
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setFrom(""); setTo(""); }}>
                Tudo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-black mt-1">{k.value}</p>
              {k.sub !== undefined && <p className="text-[10px] text-muted-foreground mt-1 min-h-[0.75rem]">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma concretagem de pista encontrada no período.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-2">Pistas por tipo de fio</h3>
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fiosData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {fiosData.map((_, i) => <Cell key={i} fill={FIO_COLORS[i % FIO_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black">{filtered.length}</span>
                    <span className="text-[10px] text-muted-foreground">{filtered.length === 1 ? "pista" : "pistas"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  {fiosData.map((f, i) => (
                    <span key={f.name} className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FIO_COLORS[i % FIO_COLORS.length] }} />
                      {f.name} <strong>{f.value}</strong> ({Math.round((f.value / filtered.length) * 100)}%)
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-2">Comparativo entre pistas (% perda)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativoPistas} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="pista" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v: number) => `${fmt(v)}%`} />
                      <Bar dataKey="perda" fill="hsl(var(--chart-primary))" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        <LabelList dataKey="perda" position="top" formatter={(v: number) => `${fmt(v)}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Evolução da % de perda</h3>
                {stats.hasPct && (
                  <span className="text-[10px] text-muted-foreground">
                    Linha tracejada = média do período ({fmt(stats.perdaPct, 3)}%)
                  </span>
                )}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v: number) => `${fmt(v)}%`} />
                    {stats.hasPct && <ReferenceLine y={stats.perdaPct} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />}
                    <Line type="monotone" dataKey="perda" stroke="hsl(var(--chart-primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-3">Concretagens</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-muted-foreground border-b">
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Lote</th>
                      <th className="py-2 pr-3">Pista</th>
                      <th className="py-2 pr-3">Fios</th>
                      <th className="py-2 pr-3 text-right">Volume (m³)</th>
                      <th className="py-2 pr-3 text-right">Mts Perda</th>
                      <th className="py-2 pr-3 text-right">% Perda</th>
                      <th className="py-2 text-right">% Aproveit.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...filtered].reverse().map((b) => (
                      <tr key={b.id}>
                        <td className="py-2 pr-3">{fmtDate(b.produced_at)}</td>
                        <td className="py-2 pr-3 font-mono">{b.batch_code}</td>
                        <td className="py-2 pr-3">{b.pista}</td>
                        <td className="py-2 pr-3">{b.fios ?? "—"}</td>
                        <td className="py-2 pr-3 text-right">{fmt(Number(b.volume_concreto_m3) || 0, 1)}</td>
                        <td className="py-2 pr-3 text-right">{fmt(Number(b.metros_perda) || 0)}</td>
                        <td className="py-2 pr-3 text-right">{fmt(Number(b.perda_pct) || 0)}</td>
                        <td className="py-2 text-right">{fmt(Number(b.aproveitamento_pct) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PistaMetricsPage;
