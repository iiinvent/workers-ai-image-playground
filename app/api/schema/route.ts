// GET /api/model/:model
// Returns a JSON object with the model information, including the schema for interacting with it

import type { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import Cloudflare from "cloudflare";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const model = request.nextUrl.searchParams.get("model");
  if (!model) return new Response("Model not specified", { status: 400 });

  const env = getRequestContext().env;
  const { CLOUDFLARE_ACCOUNT_ID: account_id } = env;
  const CLOUDFLARE_API_TOKEN = (env as any).CLOUDFLARE_API_TOKEN;

  if (!account_id) return new Response("Account ID not specified", { status: 400 });
  if (!CLOUDFLARE_API_TOKEN) return new Response("API token not specified", { status: 400 });

  try {
    const client = new Cloudflare({
      apiToken: CLOUDFLARE_API_TOKEN,
    });
    let schema;
    try {
      schema = await client.workers.ai.models.schema.get({
        account_id,
        model,
      });
    } catch (cfError) {
      console.error('Cloudflare API error:', cfError);
      return new Response('Cloudflare API error', { status: 502 });
    }
    return new Response(JSON.stringify(schema), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error('Unexpected error in schema GET:', error);
    return new Response(error?.message || 'Internal Server Error', { status: 500 });
  }
}
