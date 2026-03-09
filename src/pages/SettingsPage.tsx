import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProductsTab } from "@/components/settings/ProductsTab";
import { ProductTypesTab } from "@/components/settings/ProductTypesTab";
import { RuptureDaysTab } from "@/components/settings/RuptureDaysTab";
import { WebhooksTab } from "@/components/settings/WebhooksTab";

const SettingsPage = () => {
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
                  <Input defaultValue="Lajeforro Matriz" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input placeholder="Endereço completo" />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Técnico</Label>
                  <Input placeholder="Nome do responsável" />
                </div>
              </div>
              <Button>Salvar</Button>
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
                  <Input type="number" defaultValue="550" />
                </div>
                <div className="space-y-2">
                  <Label>Densidade Cimento (g/cm³)</Label>
                  <Input type="number" defaultValue="3.15" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Fórmula Tensão — Divisor A</Label>
                  <Input type="number" defaultValue="0.0546" step="0.0001" />
                </div>
                <div className="space-y-2">
                  <Label>Fórmula Tensão — Divisor B</Label>
                  <Input type="number" defaultValue="98.0665" step="0.0001" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Alterações afetam cálculos futuros. Análises existentes não são recalculadas.</p>
              <Button>Salvar Parâmetros</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Metas de Rompimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Configuração de metas por tipo de análise e idade.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card className="shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Configuração de webhooks para integrações externas.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ruptures">
          <RuptureDaysTab />
        </TabsContent>

        <TabsContent value="sieves">
          <Card className="shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Peneiras</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Peneiras padrão do sistema (somente leitura).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
