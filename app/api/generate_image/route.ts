// a next.js route that handles a JSON post request with prompt and model
// and calls the Cloudflare Workers AI model

import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext();
    const { AI, BUCKET } = context.env;
    let body;
    try {
      body = await request.json() as { prompt?: string, model?: string };
    } catch (jsonError) {
      console.error('Failed to parse JSON body:', jsonError);
      return new Response('Invalid JSON body', { status: 400 });
    }
    const prompt = body.prompt;
    let model = body.model;
    if (!prompt) {
      console.error('Missing prompt in request body');
      return new Response('Missing prompt in request body', { status: 400 });
    }
    if (!model) model = "@cf/black-forest-labs/flux-1-schnell";

    const inputs = { prompt };
    let response;
    try {
      response = await AI.run(model as keyof AiModels, inputs);
    } catch (aiError) {
      console.error('AI.run failed:', aiError);
      return new Response('AI model failed to generate image', { status: 500 });
    }

    // Type guard to ensure response is an object and has an 'image' property
    if (typeof response !== 'object' || response === null || !('image' in response) || typeof (response as any).image !== 'string') {
      console.error('Model did not return an image:', response);
      return new Response('Model did not return an image.', { status: 500 });
    }

    const promptKey = encodeURIComponent(prompt.replace(/\s/g, '-'));
    let img;
    try {
      const binaryString = atob((response as any).image);
      // @ts-ignore
      img = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    } catch (decodeError) {
      console.error('Failed to decode image:', decodeError);
      return new Response('Failed to decode image', { status: 500 });
    }
    try {
      await BUCKET.put(`${promptKey}.jpeg`, img);
    } catch (bucketError) {
      console.error('Failed to upload image to bucket:', bucketError);
      return new Response('Failed to upload image to bucket', { status: 500 });
    }

    return new Response(`data:image/jpeg;base64,${(response as any).image}`, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  } catch (error: any) {
    console.error('Unexpected error in generate_image POST:', error);
    return new Response(error?.message || 'Internal Server Error', { status: 500 });
  }
}

