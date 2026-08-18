import { FlaskConical, Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// ESTUDO DE DOSAGEM E OTIMIZAÇÃO — LAJE PROTENDIDA (WET CASTING)
// =============================================================================
// Placeholder criado para marcar o ponto de retomada da implementação do
// módulo completo (geração e ranqueamento de traços candidatos calibrados
// pelos experimentos reais A/B, meta de 25 MPa em 24h). Não altera nenhum
// fluxo existente (wizard de análise, granulometria, dosagem, produção).
//
// Plano completo salvo em: C:\Users\Laje Forro\.claude\plans\fizzy-booping-penguin.md
// =============================================================================

export default function DosageStudyPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight">Estudo de Dosagem (Wet Casting)</h1>
          <p className="text-xs text-muted-foreground">Laje / Vigota / Painel Protendido</p>
        </div>
        <Badge variant="outline" className="ml-auto gap-1.5 text-amber-700 border-amber-300 bg-amber-50">
          <Construction className="h-3 w-3" /> Em construção
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">O que vem por aqui</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Este módulo vai permitir estudar e otimizar a dosagem do concreto de laje protendida
            produzida por <strong>Wet Casting</strong>, com meta de <strong>25 MPa em 24 horas</strong>,
            a partir de:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Comparação dos dois traços experimentais reais já registrados (Experimento A e Experimento B);</li>
            <li>Geração de novos traços candidatos, calibrados pela região definida pelos experimentos reais — sem repetir A, B, nem uma simples média entre eles;</li>
            <li>Ranking dos 10 melhores candidatos por resistência estimada, consumo de cimento e custo;</li>
            <li>Alertas de composição (excesso de finos, baixa participação de areia/brita) e marcação de extrapolação experimental;</li>
            <li>Registro do resultado real de resistência de cada candidato testado, com status (Simulação → Candidato para Ensaio → Validado Experimentalmente).</li>
          </ul>
          <p className="pt-2 text-xs italic">
            Nenhum traço aqui será apresentado como "ideal" ou "validado" apenas por cálculo — sempre como estimativa,
            até confirmação por ensaio real.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
