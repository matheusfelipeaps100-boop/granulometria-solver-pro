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

    const { userId } = await req.json();
    if (!userId) throw new Error('Missing required field: userId');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    if (user.id === userId) throw new Error('Você não pode excluir sua própria conta.');

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || callerProfile?.role?.toLowerCase() !== 'admin') {
      throw new Error('Forbidden: Only administrators can delete users.');
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError || targetProfile?.organization_id !== callerProfile.organization_id) {
      throw new Error('Forbidden: Cannot delete a user from another organization.');
    }

    // Nullify FK references before deleting so constraints don't block the cascade
    await adminClient.from('rupture_schedules').update({ responsavel_id: null }).eq('responsavel_id', userId);
    await adminClient.from('rupture_samples').update({ registrado_por: null }).eq('registrado_por', userId);
    await adminClient.from('analyses').update({ analista_id: null }).eq('analista_id', userId);
    await adminClient.from('analyses').update({ aprovado_por: null }).eq('aprovado_por', userId);
    await adminClient.from('analyses').update({ liberado_por: null }).eq('liberado_por', userId);
    await adminClient.from('analyses').update({ created_by: null }).eq('created_by', userId);
    await adminClient.from('production_batches').update({ operador_id: null }).eq('operador_id', userId);
    await adminClient.from('production_batches').update({ created_by: null }).eq('created_by', userId);
    await adminClient.from('materials').update({ created_by: null }).eq('created_by', userId);
    await adminClient.from('standard_curves').update({ created_by: null }).eq('created_by', userId);
    await adminClient.from('webhook_configs').update({ created_by: null }).eq('created_by', userId);
    await adminClient.from('notifications').delete().eq('user_id', userId);
    await adminClient.from('notification_preferences').delete().eq('user_id', userId);
    await adminClient.from('granulometry_presets').delete().eq('created_by', userId);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Usuário excluído com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[delete-user] error:', error?.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
