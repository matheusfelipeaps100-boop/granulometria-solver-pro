import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const codigo = 'ANL-2026-816';
  console.log(`Buscando ${codigo}...`);
  
  const { data, error } = await supabase
    .from("analyses")
    .select(`
      *,
      analysis_dosage(*),
      analysis_materials(
        *,
        materials(id, nome, tipo, densidade, custo_tonelada)
      )
    `)
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    console.error("Erro na query:", error);
  } else if (!data) {
    console.log("Nenhum dado encontrado para", codigo);
  } else {
    console.log("Dados encontrados!");
    console.dir(data, { depth: null });
  }
}

testFetch();
