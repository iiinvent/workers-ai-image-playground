// a next.js route that handles a JSON post request with prompt and model
// and calls the Cloudflare Workers AI model

import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext()
    const { AI, BUCKET } = context.env
    const body = await request.json() as { prompt: string, model?: string }
    const prompt = body.prompt
    let model = body.model
    if (!model) model = "@cf/black-forest-labs/flux-1-schnell"

    const inputs = { prompt }
    const response = await AI.run(model as keyof AiModels, inputs);

    // Type guard to ensure response is an object and has an 'image' property
    if (typeof response !== 'object' || response === null || !('image' in response) || typeof (response as any).image !== 'string') {
      return new Response('Model did not return an image.', { status: 500 });
    }

    const promptKey = encodeURIComponent(prompt.replace(/\s/g, '-'));
    const binaryString = atob((response as any).image);

    // @ts-ignore
    const img = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    await BUCKET.put(`${promptKey}.jpeg`, img);

    return new Response(`data:image/jpeg;base64,${(response as any).image}`, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  } catch (error: any) {
    console.log(error)
    return new Response(error.message, { status: 500 })
  }
}
