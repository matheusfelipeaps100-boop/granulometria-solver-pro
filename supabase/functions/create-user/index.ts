// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const { email, password, nome, role, ativo } = await req.json();
    if (!email || !password || !nome || !role) {
      throw new Error('Missing required fields: email, password, nome, role');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Busca perfil do chamador para verificar permissão e pegar organization_id
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || callerProfile?.role?.toLowerCase() !== 'admin') {
      throw new Error('Forbidden: Only administrators can create new users.');
    }

    const orgId = callerProfile.organization_id;

    // Cria o usuário no Supabase Auth (metadata completo para o trigger usar)
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, role: role.toLowerCase(), ativo: ativo ?? true, organization_id: orgId }
    });

    if (createUserError) throw createUserError;

    // Upsert do perfil com todos os dados corretos (sobrescreve o que o trigger criou)
    const { error: upsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: createdUser.user.id,
        nome,
        email,
        role: role.toLowerCase(),
        organization_id: orgId,
        ativo: ativo ?? true,
      }, { onConflict: 'id' });

    if (upsertError) throw upsertError;

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
