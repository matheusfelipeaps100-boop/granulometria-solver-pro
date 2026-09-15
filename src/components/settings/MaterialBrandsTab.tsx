import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useMaterialBrands, MaterialBrandTipo } from "@/hooks/api/useMaterialBrands";
import { Plus, RefreshCw, Package } from "lucide-react";
import { toast } from "sonner";

function BrandList({ tipo, titulo }: { tipo: MaterialBrandTipo; titulo: string }) {
  const { brands, isLoading, createBrand, updateBrand, deactivateBrand, isCreating } = useMaterialBrands(tipo);
  const [nome, setNome] = useState("");
  const [fornecedor, setFornecedor] = useState("");

  const handleAdd = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome/marca.");
      return;
    }
    try {
      await createBrand({ tipo, nome: nome.trim(), fornecedor: fornecedor.trim() || null });
      setNome("");
      setFornecedor("");
      toast.success("Marca cadastrada.");
    } catch (error) {
      toast.error("Erro ao cadastrar marca.");
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      if (ativo) {
        await updateBrand({ id, ativo: true });
      } else {
        await deactivateBrand(id);
      }
    } catch (error) {
      toast.error("Erro ao atualizar marca.");
    }
  };

  return (
    <Card className="shadow-sm mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-6 flex items-center justify-center text-primary gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma marca cadastrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{brand.nome}</p>
                  {brand.fornecedor && (
                    <p className="text-xs text-muted-foreground truncate">{brand.fornecedor}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!brand.ativo && <Badge variant="secondary">Inativa</Badge>}
                  <Switch
                    checked={brand.ativo}
                    onCheckedChange={(checked) => handleToggleAtivo(brand.id, checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 max-w-xl">
          <Input
            placeholder="Nome/marca"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            placeholder="Fornecedor (opcional)"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="gap-1" disabled={isCreating}>
            {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MaterialBrandsTab() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mt-4">
        Cadastro de marcas de cimento e aditivo, usadas na etapa de dosagem das análises para registrar qual marca foi utilizada em cada traço.
      </p>
      <BrandList tipo="cimento" titulo="Marcas de Cimento" />
      <BrandList tipo="aditivo" titulo="Marcas de Aditivo" />
    </div>
  );
}
