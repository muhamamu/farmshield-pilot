import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const bucket = "farmshield-land-documents";
const scannerUrl = "https://farmshield-pilot.vercel.app/internal/malware-scan/scan";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in first" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return json({ error: "Scanner authentication is not configured" }, 503);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  let recordId: string | null = null;
  let recordKind: "draft" | "document" | null = null;
  let ticketIssued = false;
  let recorded = false;
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (userResult.error || !user || user.is_anonymous) return json({ error: "Sign in first" }, 401);

    const input = await req.json();
    const draftId = typeof input?.draft_id === "string" ? input.draft_id : null;
    const documentId = typeof input?.document_id === "string" ? input.document_id : null;
    if (Boolean(draftId) === Boolean(documentId)) return json({ error: "Choose one document" }, 400);
    recordKind = draftId ? "draft" : "document";
    recordId = draftId || documentId;

    const table = recordKind === "draft" ? "farmshield_land_document_drafts" : "farmshield_land_documents";
    const { data: record, error: recordError } = await supabase.from(table)
      .select("id,owner_id,object_path,scan_status")
      .eq("id", recordId).eq("owner_id", user.id).single();
    if (recordError || !record) return json({ error: "Document not found" }, 404);
    if (record.scan_status === "clean") return json({ status: "clean" });

    const ticketResult = await supabase.rpc("farmshield_issue_land_document_scan", {
      draft_id: draftId,
      document_id: documentId,
    });
    if (ticketResult.error) throw ticketResult.error;
    const ticket = ticketResult.data;
    if (ticket?.status === "clean") return json({ status: "clean" });
    ticketIssued = true;

    const signedResult = await supabase.storage.from(bucket).createSignedUrl(record.object_path, 120);
    if (signedResult.error || !signedResult.data?.signedUrl) throw signedResult.error || new Error("Could not read the private file");

    const scannerResponse = await fetch(scannerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, download_url: signedResult.data.signedUrl }),
      signal: AbortSignal.timeout(240_000),
    });
    if (!scannerResponse.ok) throw new Error(`Malware scanner returned ${scannerResponse.status}`);
    const receipt = await scannerResponse.json();
    if (!receipt || !["clean", "infected"].includes(receipt.verdict)) throw new Error("Malware scanner returned an invalid result");

    const recordedResult = await supabase.rpc("farmshield_record_land_document_scan", { receipt });
    if (recordedResult.error) throw recordedResult.error;
    recorded = true;
    return json({ status: recordedResult.data });
  } catch (error) {
    if (ticketIssued && !recorded && recordId && recordKind) {
      await supabase.rpc("farmshield_release_land_document_scan", {
        draft_id: recordKind === "draft" ? recordId : null,
        document_id: recordKind === "document" ? recordId : null,
      }).catch(() => undefined);
    }
    console.error("Land document scan failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "The file could not be scanned. It remains private and cannot be submitted or opened by reviewers." }, 503);
  }
});

