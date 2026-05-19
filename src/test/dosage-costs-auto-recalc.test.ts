import { describe, it, expect } from 'vitest';
import { calcDosage } from '@/lib/granulometry-engine';
import { calcularCustoMaterial } from '@/lib/utils';

describe('Comportamento Automático de Recálculo de Custos', () => {
  
  /**
   * Teste: Quando consumo_alvo_m3 é alterado, consumo_cimento_batelada deve
   * recalcular independentemente de volume_m3 permanecer o mesmo
   */
  it('deve recalcular consumo_cimento_batelada quando consumo_alvo_m3 muda', () => {
    const volume = 0.100; // Volume constante em m³
    
    // Cenário 1: Consumo Alvo = 350 kg/m³
    const result1 = calcDosage({
      relacao_cimento: 4,
      relacao_ac: 0.50,
      consumo_alvo_m3: 350,
      volume_m3: volume,
      densidade_cimento: 3.15,
      proporcoes_materiais: [
        { nome: 'Agregado', proporcao_kg: 100, proporcao_pct: 1, densidade: 2.65 }
      ],
      aditivos_ml: 0,
    });

    // Cenário 2: Consumo Alvo = 400 kg/m³ (ALTERAÇÃO DO USUÁRIO)
    const result2 = calcDosage({
      relacao_cimento: 4,
      relacao_ac: 0.50,
      consumo_alvo_m3: 400,  // ← MUDANÇA
      volume_m3: volume,      // ← MANTÉM O MESMO
      densidade_cimento: 3.15,
      proporcoes_materiais: [
        { nome: 'Agregado', proporcao_kg: 100, proporcao_pct: 1, densidade: 2.65 }
      ],
      aditivos_ml: 0,
    });

    // Verificações
    expect(result1.consumo_cimento_batelada).toBe(35); // 350 * 0.100
    expect(result2.consumo_cimento_batelada).toBe(40); // 400 * 0.100
    
    // Diferença esperada é apenas (400-350)*volume = 5kg
    expect(result2.consumo_cimento_batelada - result1.consumo_cimento_batelada).toBe(5);
  });

  /**
   * Teste: O custo do cimento deve recalcular quando consumo_cimento_batelada muda
   */
  it('deve recalcular custo do cimento baseado no novo consumo em batelada', () => {
    const precoCimentoTonelada = 500; // R$ 500/ton
    
    // Consumo 1: 35 kg
    const custo1 = calcularCustoMaterial({
      custo_valor: precoCimentoTonelada,
      custo_unidade: 'tonelada',
      quantidade: 35,
      densidade: 3.15,
    });

    // Consumo 2: 40 kg (após alteração do usuário)
    const custo2 = calcularCustoMaterial({
      custo_valor: precoCimentoTonelada,
      custo_unidade: 'tonelada',
      quantidade: 40,
      densidade: 3.15,
    });

    // Esperado: (40-35)/1000 * 500 = 0.005 * 500 = R$ 2.50 de diferença
    expect(custo2 - custo1).toBeCloseTo(2.50, 1);
    
    // Custo 1 deve ser menor que custo 2
    expect(custo1).toBeLessThan(custo2);
  });

  /**
   * Teste: Fluxo Completo - Alteração do Consumo Alvo → Recálculo de Custos
   */
  it('deve realizar cadeia completa de recálculo ao alterar consumo_alvo_m3', () => {
    const volume = 0.150; // m³
    const custo_cimento_ton = 600;
    
    // ESTADO 1: Consumo Alvo 350 kg/m³
    const dosage1 = calcDosage({
      relacao_cimento: 5,
      relacao_ac: 0.55,
      consumo_alvo_m3: 350,
      volume_m3: volume,
      densidade_cimento: 3.15,
      proporcoes_materiais: [
        { nome: 'Areia', proporcao_kg: 150, proporcao_pct: 0.5, densidade: 2.60 },
        { nome: 'Brita', proporcao_kg: 150, proporcao_pct: 0.5, densidade: 2.70 }
      ],
      aditivos_ml: 0,
    });

    const custo_inicial = calcularCustoMaterial({
      custo_valor: custo_cimento_ton,
      custo_unidade: 'tonelada',
      quantidade: dosage1.consumo_cimento_batelada,
      densidade: 3.15,
    });

    // ESTADO 2: Usuário altera para 420 kg/m³
    const dosage2 = calcDosage({
      relacao_cimento: 5,
      relacao_ac: 0.55,
      consumo_alvo_m3: 420,  // ← ALTERAÇÃO
      volume_m3: volume,
      densidade_cimento: 3.15,
      proporcoes_materiais: [
        { nome: 'Areia', proporcao_kg: 150, proporcao_pct: 0.5, densidade: 2.60 },
        { nome: 'Brita', proporcao_kg: 150, proporcao_pct: 0.5, densidade: 2.70 }
      ],
      aditivos_ml: 0,
    });

    const custo_novo = calcularCustoMaterial({
      custo_valor: custo_cimento_ton,
      custo_unidade: 'tonelada',
      quantidade: dosage2.consumo_cimento_batelada,
      densidade: 3.15,
    });

    // Validações
    expect(dosage1.consumo_cimento_batelada).toBe(52.5); // 350 * 0.150
    expect(dosage2.consumo_cimento_batelada).toBe(63);   // 420 * 0.150
    expect(custo_novo).toBeGreaterThan(custo_inicial);   // Custo deve aumentar
    
    // Porcentagem de aumento no custo deve corresponder ao aumento do consumo
    const pct_aumento_consumo = (dosage2.consumo_cimento_batelada / dosage1.consumo_cimento_batelada - 1) * 100;
    const pct_aumento_custo = (custo_novo / custo_inicial - 1) * 100;
    expect(pct_aumento_custo).toBeCloseTo(pct_aumento_consumo, 1);
  });

  /**
   * Teste: Volume Batelada pode permanecer fixo enquanto consumo recalcula
   */
  it('deve manter volume_m3 independente durante recálculo de consumo_alvo_m3', () => {
    const volume_fixo = 0.200;
    
    // Múltiplas alterações do consumo alvo, volume permanece 0.200
    const consumos = [300, 350, 400, 450, 500];
    const resultados = consumos.map(cons =>
      calcDosage({
        relacao_cimento: 4,
        relacao_ac: 0.50,
        consumo_alvo_m3: cons,
        volume_m3: volume_fixo,
        densidade_cimento: 3.15,
        proporcoes_materiais: [
          { nome: 'Agregado', proporcao_kg: 100, proporcao_pct: 1, densidade: 2.65 }
        ],
        aditivos_ml: 0,
      })
    );

    // Cada resultado deve ter volume correspondente ao consumo
    resultados.forEach((res, idx) => {
      const consumo_esperado = consumos[idx];
      const cimento_esperado = consumo_esperado * volume_fixo;
      expect(res.consumo_cimento_batelada).toBe(cimento_esperado);
    });
  });
});
