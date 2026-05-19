/**
 * Calcula o custo real de um material considerando unidade, valor cadastrado, quantidade e densidade.
 * @param custo_valor Valor cadastrado do material
 * @param custo_unidade Unidade cadastrada ('tonelada', 'kg', 'm3', 'saco', 'unidade')
 * @param quantidade Quantidade utilizada (em kg, m³, etc. conforme contexto)
 * @param densidade Densidade do material (kg/m³), se necessário para conversão
 * @returns Custo total para a quantidade informada
 */
export function calcularCustoMaterial({
  custo_valor,
  custo_unidade,
  quantidade,
  densidade
}: {
  custo_valor: number;
  custo_unidade: string;
  quantidade: number;
  densidade?: number;
}): number {
  if (!custo_valor || !custo_unidade || !quantidade) return 0;
  switch (custo_unidade) {
    case 'tonelada':
      return (custo_valor / 1000) * quantidade; // quantidade em kg
    case 'kg':
      return custo_valor * quantidade;
    case 'm3':
      // quantidade em kg, densidade em kg/m³
      if (densidade && densidade > 0) {
        const quantidadeM3 = quantidade / densidade;
        return custo_valor * quantidadeM3;
      }
      return 0;
    case 'saco':
      // Considera 50kg por saco (ajuste se necessário)
      return custo_valor * (quantidade / 50);
    case 'unidade':
      // Considera 1 unidade = 1kg (ajuste se necessário)
      return custo_valor * quantidade;
    default:
      return (custo_valor / 1000) * quantidade;
  }
}

/**
 * Calcula o custo total completo do traço (batelada e m³) com base nos dados da análise e preços atuais
 * Reutiliza a mesma lógica do StepResult para garantir consistência
 */
export function calcularCustoTracoCompleto({
  formData,
  dbMaterials,
}: {
  formData: any;
  dbMaterials: any[];
}): {
  cimentoBatelada: number;
  aditivoBatelada: number;
  agregadosBatelada: number;
  totalBatelada: number;
  totalM3: number;
} {
  let cimentoBatelada = 0;
  let agregadosBatelada = 0;
  let aditivoBatelada = 0;

  const volM3 = formData?.volume_m3 || 0.55;

  // Cimento
  const cimentoDb = dbMaterials?.find((m) => m.tipo === 'cimento' || m.nome?.toLowerCase().includes('cimento'));
  const cimento_valor = cimentoDb?.custo_valor ?? cimentoDb?.custo_tonelada ?? formData?.custo_cimento_ton ?? 0;
  const cimento_unidade = cimentoDb?.custo_unidade || (cimentoDb?.custo_tonelada != null ? 'tonelada' : 'tonelada');
  const cimento_densidade = cimentoDb?.densidade || 3.15;
  const consumo_cimento_kg = (formData?.consumo_alvo_m3 || 0) * volM3;
  cimentoBatelada = calcularCustoMaterial({
    custo_valor: cimento_valor,
    custo_unidade: cimento_unidade,
    quantidade: consumo_cimento_kg,
    densidade: cimento_densidade,
  });

  // Agregados
  agregadosBatelada = (formData?.materiais_selecionados || []).reduce((sum: number, mat: any) => {
    const dbMat = dbMaterials?.find((m) => m.id === mat.material_id);
    const custo_valor = dbMat?.custo_valor ?? dbMat?.custo_tonelada ?? 0;
    const custo_unidade = dbMat?.custo_unidade || (dbMat?.custo_tonelada != null ? 'tonelada' : 'tonelada');
    const densidade = mat.densidade || dbMat?.densidade || 2.65;
    const quantidade = mat.proporcao_kg ?? 0;
    return sum + calcularCustoMaterial({ custo_valor, custo_unidade, quantidade, densidade });
  }, 0);

  // Aditivo
  if (formData?.aditivos_ml > 0) {
    const aditivoDb = dbMaterials?.find((m) => m.tipo === 'aditivo' || m.nome?.toLowerCase().includes('aditivo'));
    const aditivo_valor = aditivoDb?.custo_valor ?? 0;
    const aditivo_unidade = aditivoDb?.custo_unidade || 'litro';
    if (aditivo_valor && formData?.aditivos_ml) {
      if (aditivo_unidade === 'litro' || aditivo_unidade === 'kg') {
        aditivoBatelada = aditivo_valor * (formData.aditivos_ml / 1000);
      } else {
        aditivoBatelada = aditivo_valor * (formData.aditivos_ml / 1000);
      }
    }
  }

  const totalBatelada = cimentoBatelada + agregadosBatelada + aditivoBatelada;
  const totalM3 = volM3 > 0 ? totalBatelada / volM3 : 0;

  return {
    cimentoBatelada,
    aditivoBatelada,
    agregadosBatelada,
    totalBatelada,
    totalM3,
  };
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
