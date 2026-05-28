import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useAnalysis, useAnalyses } from "@/hooks/api/useAnalyses";
import { useAuth } from "@/hooks/useAuth";
import { StepGranulometry } from "@/components/analysis/StepGranulometry";
import { StepDosage } from "@/components/analysis/StepDosage";
import { StepReview } from "@/components/analysis/StepReview";
import { toast } from "sonner";

export default function AnalysisDetailPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const { data: analysis, isLoading, isError } = useAnalysis(codigo || null);
  const { updateObservacoes } = useAnalyses();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "ADMIN";

  const [observacoes, setObservacoes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza estado local sempre que o dado do banco for (re)carregado
  useEffect(() => {
    setObservacoes(analysis?.observacoes || "");
  }, [analysis?.observacoes]);

  const savedValue = analysis?.observacoes || "";
  const hasChanges = observacoes !== savedValue;

  const handleSaveObservacoes = async () => {
    if (!analysis?.id) return;
    setIsSaving(true);
    try {
      await updateObservacoes({ id: analysis.id, observacoes });
      toast.success("Observações salvas com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao salvar observações: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !analysis) {
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
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium capitalize">{String(analysis.tipo).replace(/_/g, " ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium">{new Date(analysis.data_analise + "T12:00:00").toLocaleDateString("pt-BR")}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <StatusBadge status={analysis.status} />
          </CardContent>
        </Card>
      </div>

      {/* Card de Observações — visível para todos, editável só para ADMIN */}
      <Card className={isAdmin ? "border-warning/30 bg-warning/5" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Observações</CardTitle>
            {isAdmin && hasChanges && (
              <Button size="sm" className="gap-2" onClick={handleSaveObservacoes} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações sobre esta análise..."
              rows={3}
              className="resize-none text-sm"
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {savedValue || "Nenhuma observação registrada."}
            </p>
          )}
        </CardContent>
      </Card>

      {analysis.formData && (
        <div className="mt-8 border-t pt-8 pb-32 flex flex-col gap-12">
          <section>
            <h2 className="text-xl font-bold mb-6 text-primary">1. Granulometria</h2>
            <div className="pointer-events-none">
              <StepGranulometry
                data={analysis.formData}
                onChange={() => {}}
                readOnly={true}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-6 text-primary">2. Dosagem</h2>
            <div className="pointer-events-none">
              <StepDosage
                data={analysis.formData}
                onChange={() => {}}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-6 text-primary">3. Revisão Final</h2>
            <StepReview
              data={analysis.formData}
              onApprove={() => {}}
              readOnly={true}
            />
          </section>
        </div>
      )}
    </div>
  );
}
