import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProductsTab } from "@/components/settings/ProductsTab";
import { ProductTypesTab } from "@/components/settings/ProductTypesTab";
import { RuptureDaysTab } from "@/components/settings/RuptureDaysTab";
import { WebhooksTab } from "@/components/settings/WebhooksTab";
import { GoalsTab } from "@/components/settings/GoalsTab";
import { SievesTab } from "@/components/settings/SievesTab";
import { UsersTab } from "@/components/settings/UsersTab";
import { useOrganization } from "@/hooks/api/useOrganization";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const SettingsPage = () => {
  const { organization, updateOrganization, isLoading: loadingOrg } = useOrganization();
  const { settings, updateSettings, isLoading: loadingSettings, isUpdating: savingSettings } = useTechnicalSettings();
  
  const [localIdentity, setLocalIdentity] = useState({
    nome: "",
    cnpj: "",
    endereco: "",
    responsavel_tecnico: "",
  });

  useEffect(() => {
    if (organization) {
      setLocalIdentity({
        nome: organization.nome || "",
        cnpj: organization.cnpj || "",
        endereco: organization.endereco || "",
        responsavel_tecnico: organization.responsavel_tecnico || "",
      });
    }
  }, [organization]);

  const [localParams, setLocalParams] = useState({
    volume_batelada: "550",
    densidade_cimento: "3.15",
    formula_tensao_a: "0.0546",
    formula_tensao_b: "98.0665",
    formula_tensao_paver: "1.729",
  });

  useEffect(() => {
    if (settings) {
      setLocalParams({
        volume_batelada: String(settings.volume_batelada_padrao),
        densidade_cimento: String(settings.densidade_cimento_padrao),
        formula_tensao_a: String(settings.formula_tensao_a),
        formula_tensao_b: String(settings.formula_tensao_b),
        formula_tensao_paver: String(settings.formula_tensao_paver),
      });
    }
  }, [settings]);

  const handleSaveIdentity = async () => {
    try {
      await updateOrganization(localIdentity);
      toast.success("Identidade da organização salva com sucesso.");
    } catch (error) {
      toast.error("Erro ao salvar identidade.");
    }
  };

  const handleSaveParams = async () => {
    const vol = parseFloat(localParams.volume_batelada);
    const dens = parseFloat(localParams.densidade_cimento);
    const fa = parseFloat(localParams.formula_tensao_a);
    const fb = parseFloat(localParams.formula_tensao_b);
    const fp = parseFloat(localParams.formula_tensao_paver);

    if (isNaN(vol) || isNaN(dens) || isNaN(fa) || isNaN(fb) || isNaN(fp)) {
      toast.error("Por favor, preencha valores numéricos válidos.");
      return;
    }

    try {
      await updateSettings({
        volume_batelada_padrao: vol,
        densidade_cimento_padrao: dens,
        formula_tensao_a: fa,
        formula_tensao_b: fb,
        formula_tensao_paver: fp,
      });
      toast.success("Parâmetros de cálculo salvos com sucesso.");
    } catch (error) {
      console.error("[handleSaveParams] Erro ao salvar parâmetros:", {
        erro: error,
        mensagem: (error as any)?.message,
        codigo: (error as any)?.code,
        detalhes: (error as any)?.details,
      });
      const mensagemErro = (error as any)?.message || "desconhecido";
      toast.error(`Erro ao salvar parâmetros: ${mensagemErro}`);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações técnicas da organização</p>
      </div>

      <Tabs defaultValue="products">
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <TabsList className="inline-flex w-auto min-w-full sm:w-full">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="productTypes">Tipos</TabsTrigger>
          <TabsTrigger value="identity">Identidade</TabsTrigger>
          <TabsTrigger value="params">Parâmetros</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="ruptures">Rompimentos</TabsTrigger>
          <TabsTrigger value="sieves">Peneiras</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="productTypes">
          <ProductTypesTab />
        </TabsContent>

        <TabsContent value="identity">
          <Card className="shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Identidade da Organização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Organização</Label>
                  <Input 
                    value={localIdentity.nome} 
                    onChange={e => setLocalIdentity(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input 
                    placeholder="00.000.000/0000-00"
                    value={localIdentity.cnpj}
                    onChange={e => setLocalIdentity(prev => ({ ...prev, cnpj: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input 
                    placeholder="Endereço completo"
                    value={localIdentity.endereco}
                    onChange={e => setLocalIdentity(prev => ({ ...prev, endereco: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Técnico</Label>
                  <Input 
                    placeholder="Nome do responsável"
                    value={localIdentity.responsavel_tecnico}
                    onChange={e => setLocalIdentity(prev => ({ ...prev, responsavel_tecnico: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleSaveIdentity}>Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="params">
          <Card className="shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Parâmetros de Cálculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Volume Batelada Padrão (L)</Label>
                  <Input 
                    type="number" 
                    value={localParams.volume_batelada}
                    onChange={e => setLocalParams(prev => ({ ...prev, volume_batelada: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Densidade Cimento (g/cm³)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={localParams.densidade_cimento}
                    onChange={e => setLocalParams(prev => ({ ...prev, densidade_cimento: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fórmula Tensão — Divisor A</Label>
                  <Input 
                    type="number" 
                    step="0.0001"
                    value={localParams.formula_tensao_a}
                    onChange={e => setLocalParams(prev => ({ ...prev, formula_tensao_a: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fórmula Tensão — Divisor B</Label>
                  <Input 
                    type="number" 
                    step="0.0001"
                    value={localParams.formula_tensao_b}
                    onChange={e => setLocalParams(prev => ({ ...prev, formula_tensao_b: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fórmula Tensão — Piso/Paver</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    value={localParams.formula_tensao_paver}
                    onChange={e => setLocalParams(prev => ({ ...prev, formula_tensao_paver: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Alterações afetam cálculos futuros. Análises existentes não são recalculadas.</p>
              <Button onClick={handleSaveParams} disabled={savingSettings}>
                {savingSettings && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Parâmetros
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>

        <TabsContent value="ruptures">
          <RuptureDaysTab />
        </TabsContent>

        <TabsContent value="sieves">
          <SievesTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
