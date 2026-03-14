import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft } from "lucide-react";

const mockAnalyses = [
  { codigo: "ANL-2026-012", nome: "Paver H8 Alta Resistência", tipo: "paver", analista: "Carlos Silva", data: "07/03/2026", status: "aprovado" as const },
  { codigo: "ANL-2026-011", nome: "Bloco Estrutural 14x19x39", tipo: "bloco_estrutural", analista: "Maria Santos", data: "05/03/2026", status: "liberado_producao" as const },
  { codigo: "ANL-2026-010", nome: "Bloco Vedação Standard", tipo: "bloco_vedacao", analista: "João Oliveira", data: "03/03/2026", status: "em_analise" as const },
  { codigo: "ANL-2026-009", nome: "CP Teste Dosagem", tipo: "cp", analista: "Carlos Silva", data: "01/03/2026", status: "rascunho" as const },
];

const AnalysisDetailPage = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const analysis = mockAnalyses.find((a) => a.codigo === codigo);

  if (!analysis) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/analyses")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Análise não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/analyses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{analysis.codigo}</h1>
          <p className="text-sm text-muted-foreground">{analysis.nome}</p>
        </div>
        <StatusBadge status={analysis.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Código</span><span className="font-medium">{analysis.codigo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="font-medium">{analysis.nome}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium capitalize">{analysis.tipo.replace(/_/g, " ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Analista</span><span className="font-medium">{analysis.analista}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium">{analysis.data}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <StatusBadge status={analysis.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalysisDetailPage;
