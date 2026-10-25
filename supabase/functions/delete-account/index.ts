import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required.' }), { status: 405, headers: corsHeaders });

  const authorization = request.headers.get('Authorization');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization || !projectUrl || !publishableKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Account deletion is not configured.' }), { status: 503, headers: corsHeaders });
  }

  const userClient = createClient(projectUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'A valid signed-in session is required.' }), { status: 401, headers: corsHeaders });

  const adminClient = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(JSON.stringify({ error: 'The account could not be deleted. Please try again or contact support.' }), { status: 500, headers: corsHeaders });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
