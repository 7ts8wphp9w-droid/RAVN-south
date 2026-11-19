import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
function reply(status: number, message: string) {
  return Response.json({ message }, { status, headers: cors });
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply(405, "Use POST.");
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, "Sign in again.");
  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "DELETE") return reply(400, "Confirm account deletion.");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return reply(401, "Sign in again.");
  const bucket = admin.storage.from("vault-media");
  // Uploads use a flat folder named for the authenticated member.
  try {
    for (;;) {
      const files = await bucket.list(user.id, { limit: 100 });
      if (files.error) throw files.error;
      if (!files.data.length) break;
      const removed = await bucket.remove(files.data.map(file => user.id + "/" + file.name));
      if (removed.error || !removed.data?.length) throw new Error("Media removal failed.");
    }
    const deleted = await admin.auth.admin.deleteUser(user.id);
    if (deleted.error) throw deleted.error;
    return reply(200, "Account deleted.");
  } catch {
    return reply(503, "Deletion did not finish. Please try again.");
  }
});
