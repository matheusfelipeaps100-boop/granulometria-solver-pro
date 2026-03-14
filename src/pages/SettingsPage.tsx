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
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";
import { toast } from "sonner";

const SettingsPage = () => {
  const { identity, updateIdentity, params, updateParams } = useAppStore();
  const [localIdentity, setLocalIdentity] = useState(identity);
  const [localParams, setLocalParams] = useState({
    volume_batelada: String(params.volume_batelada),
    densidade_cimento: String(params.densidade_cimento),
    fator_a: String(params.fator_a),
    fator_b: String(params.fator_b),
  });

  const handleSaveIdentity = () => {
    updateIdentity(localIdentity);
    toast.success("Identidade da organização salva com sucesso.");
  };

  const handleSaveParams = () => {
    const vol = parseFloat(localParams.volume_batelada);
    const dens = parseFloat(localParams.densidade_cimento);
    const fa = parseFloat(localParams.fator_a);
    const fb = parseFloat(localParams.fator_b);

    if (isNaN(vol) || isNaN(dens) || isNaN(fa) || isNaN(fb)) {
      toast.error("Por favor, preencha valores numéricos válidos.");
      return;
    }

    updateParams({
      volume_batelada: vol,
      densidade_cimento: dens,
      fator_a: fa,
      fator_b: fb,
    });
    toast.success("Parâmetros de cálculo salvos com sucesso.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações técnicas da organização</p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="productTypes">Tipos de Análise</TabsTrigger>
          <TabsTrigger value="identity">Identidade</TabsTrigger>
          <TabsTrigger value="params">Parâmetros</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="ruptures">Rompimentos</TabsTrigger>
          <TabsTrigger value="sieves">Peneiras</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

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
                    value={localParams.fator_a}
                    onChange={e => setLocalParams(prev => ({ ...prev, fator_a: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fórmula Tensão — Divisor B</Label>
                  <Input 
                    type="number" 
                    step="0.0001"
                    value={localParams.fator_b}
                    onChange={e => setLocalParams(prev => ({ ...prev, fator_b: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Alterações afetam cálculos futuros. Análises existentes não são recalculadas.</p>
              <Button onClick={handleSaveParams}>Salvar Parâmetros</Button>
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
