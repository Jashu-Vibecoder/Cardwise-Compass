import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://cardwise-compass.vercel.app';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Vary': 'Origin',
};

function jsonError(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ code, message }), { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonError('METHOD_NOT_ALLOWED', 'POST required.', 405);

  const authorization = request.headers.get('Authorization');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization || !projectUrl || !publishableKey || !serviceRoleKey) {
    return jsonError('ACCOUNT_DELETE_NOT_CONFIGURED', 'Account deletion is not configured.', 503);
  }

  const userClient = createClient(projectUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return jsonError('AUTHENTICATION_REQUIRED', 'A valid signed-in session is required.', 401);

  const adminClient = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('ACCOUNT_DELETE_FAILED', { userId: user.id, message: deleteError.message, status: deleteError.status });
    return jsonError('ACCOUNT_DELETE_FAILED', 'The account could not be deleted. Please try again or contact support.', 500);
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
