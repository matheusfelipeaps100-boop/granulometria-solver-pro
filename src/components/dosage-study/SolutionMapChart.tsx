import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { kgCimentoPorM3, custoPorM3, type WetCastExperiment } from "@/lib/wet-cast-optimizer";

const BRAND_RED = "hsl(0, 80%, 38%)";
const BRAND_GRAY = "hsl(0, 0%, 65%)";

interface Props {
  experimentosReais: WetCastExperiment[];
  candidatos: WetCastExperiment[];
  custoCimentoTon: number;
  custoAditivoLt: number;
}

/**
 * Mapa de soluções: cimento (kg/m³) × custo (R$/m³), tamanho/posição não
 * codificam "melhor" — só ajudam a visualizar onde cada ponto real e
 * candidato caem. Experimentos reais em destaque, candidatos em cinza.
 */
export function SolutionMapChart({ experimentosReais, candidatos, custoCimentoTon, custoAditivoLt }: Props) {
  const toPoint = (e: WetCastExperiment) => ({
    codigo: e.codigo,
    cimento: Math.round(kgCimentoPorM3(e)),
    custo: Math.round(custoPorM3(e, custoCimentoTon, custoAditivoLt) * 100) / 100,
    resistencia: e.resultado_resistencia_mpa ?? e.resistencia_estimada_mpa ?? null,
  });

  const pontosReais = experimentosReais.map(toPoint);
  const pontosCandidatos = candidatos.slice(0, 30).map(toPoint);

  if (pontosReais.length === 0 && pontosCandidatos.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Sem dados suficientes para o mapa de soluções.</p>;
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" dataKey="cimento" name="Cimento" unit=" kg/m³" tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="custo" name="Custo" unit=" R$/m³" tick={{ fontSize: 10 }} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number, name: string) => [value, name]}
            labelFormatter={() => ""}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const p = payload[0].payload as ReturnType<typeof toPoint>;
              return (
                <div className="rounded-md border bg-background px-2 py-1 text-[11px] shadow-sm">
                  <div className="font-bold">{p.codigo}</div>
                  <div>{p.cimento} kg cimento/m³</div>
                  <div>R$ {p.custo}/m³</div>
                  {p.resistencia != null && <div>{p.resistencia} MPa</div>}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter name="Experimentos Reais" data={pontosReais} fill={BRAND_RED} />
          <Scatter name="Candidatos Gerados" data={pontosCandidatos} fill={BRAND_GRAY} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
