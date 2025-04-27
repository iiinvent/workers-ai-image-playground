// GET /api/model/:model
// Returns a JSON object with the model information, including the schema for interacting with it

import type { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import Cloudflare from "cloudflare";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Validate query param
  const model = request.nextUrl.searchParams.get("model");
  if (!model) {
    return new Response(JSON.stringify({ error: "Model not specified" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get environment variables
  const env = getRequestContext().env;
  const account_id = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;

  if (!account_id || !apiToken) {
    return new Response(
      JSON.stringify({ error: !account_id ? "Account ID not specified" : "API token not specified" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const client = new Cloudflare({ apiToken });
    const schema = await client.workers.ai.models.schema.get({ account_id, model });
    return new Response(JSON.stringify(schema), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Cloudflare API error
    const message = err?.message || "Cloudflare API error";
    const status = err?.status === 401 ? 401 : 502;
    console.error("Cloudflare API error in /api/schema:", err);
    return new Response(
      JSON.stringify({ error: message, details: err?.errors || undefined }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
