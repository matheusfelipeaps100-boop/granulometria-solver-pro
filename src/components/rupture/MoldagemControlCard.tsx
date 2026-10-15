import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useProduction } from "@/hooks/api/useProduction";

interface MoldagemBatch {
  id: string;
  produced_at: string;
  moldagem_data?: string | null;
  moldagem_hora?: string | null;
  moldagem_temperatura?: number | null;
  moldagem_tempo?: string | null;
  moldagem_slump_cm?: number | null;
}

interface MoldagemControlCardProps {
  batch: MoldagemBatch;
  canEdit: boolean;
}

const toLocalParts = (iso: string) => {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return { data: local.slice(0, 10), hora: local.slice(11, 16) };
};

export function MoldagemControlCard({ batch, canEdit }: MoldagemControlCardProps) {
  const { updateBatchMoldagem, isUpdatingMoldagem } = useProduction();

  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [tempo, setTempo] = useState("");
  const [slump, setSlump] = useState("");

  // Sem valor salvo, sugere data/hora da produção do lote
  useEffect(() => {
    const fallback = toLocalParts(batch.produced_at);
    setData(batch.moldagem_data ?? fallback.data);
    setHora(batch.moldagem_hora?.slice(0, 5) ?? fallback.hora);
    setTemperatura(batch.moldagem_temperatura != null ? String(batch.moldagem_temperatura) : "");
    setTempo(batch.moldagem_tempo ?? "");
    setSlump(batch.moldagem_slump_cm != null ? String(batch.moldagem_slump_cm) : "");
  }, [batch.id, batch.moldagem_data, batch.moldagem_hora, batch.moldagem_temperatura, batch.moldagem_tempo, batch.moldagem_slump_cm, batch.produced_at]);

  const handleSave = async () => {
    try {
      await updateBatchMoldagem({
        id: batch.id,
        moldagem_data: data || null,
        moldagem_hora: hora || null,
        moldagem_temperatura: temperatura !== "" ? Number(temperatura) : null,
        moldagem_tempo: tempo || null,
        moldagem_slump_cm: slump !== "" ? Number(slump) : null,
      });
      toast.success("Controle de moldagem salvo");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar o controle de moldagem");
    }
  };

  return (
    <Card className="shadow-sm border-l-4 border-l-primary/30">
      <CardHeader className="pb-3 space-y-1">
        <CardTitle className="text-base">Controle de Moldagem</CardTitle>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          Dados do lote — iguais em todas as idades de rompimento
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="mold-data">Data</Label>
            <Input id="mold-data" type="date" value={data} onChange={(e) => setData(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mold-hora">Hora da Moldagem</Label>
            <Input id="mold-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mold-temp">Temperatura (°C)</Label>
            <Input
              id="mold-temp"
              type="number"
              step="0.1"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              placeholder="Ex: 19,2"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Tempo (sol/chuva)</Label>
            <Select value={tempo} onValueChange={setTempo} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sol">Sol</SelectItem>
                <SelectItem value="nublado">Nublado</SelectItem>
                <SelectItem value="chuva">Chuva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mold-slump">Slump Test (cm)</Label>
            <Input
              id="mold-slump"
              type="number"
              step="0.1"
              min="0"
              value={slump}
              onChange={(e) => setSlump(e.target.value)}
              placeholder="Ex: 11"
              disabled={!canEdit}
            />
          </div>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleSave} disabled={isUpdatingMoldagem}>
              <Save className="h-4 w-4" />
              {isUpdatingMoldagem ? "Salvando..." : "Salvar Moldagem"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
