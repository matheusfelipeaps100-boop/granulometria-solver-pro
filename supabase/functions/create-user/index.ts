// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validar se o JWT foi enviado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // 2. Extrair o body
    const { email, password, nome, role, ativo } = await req.json();

    if (!email || !password || !nome || !role) {
      throw new Error('Missing required fields: email, password, nome, role');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // 3. Client do usuário requisitante: Usado apenas para verificar autenticação
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 4. Client Admin: Usado para operações privilegiadas (ler perfis sem RLS barrar, criar conta)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 5. Verificar se quem chamou é de fato admin na tabela profiles
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Forbidden: Only administrators can create new users.');
    }

    // 6. Criar o usuário pelo Supabase Admin API
    // Isso NÃO desloga o usuário da sessão web e injeta metadados com segurança.
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma e-mail para esse app interno
      user_metadata: {
        nome,
        role,
        ativo: ativo ?? true
      }
    });

    if (createUserError) {
      throw createUserError;
    }

    return new Response(JSON.stringify({ 
      user: createdUser.user,
      message: 'Usuário cadastrado com sucesso.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
