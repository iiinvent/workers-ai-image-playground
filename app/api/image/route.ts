import { getRequestContext } from '@cloudflare/next-on-pages'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      console.error('Missing key in query parameter');
      return new Response('Missing key', { status: 400 });
    }

    const context = getRequestContext();
    const { BUCKET } = context.env;

    let object;
    try {
      object = await BUCKET.get(key as string);
    } catch (bucketError) {
      console.error('Error accessing BUCKET:', bucketError);
      return new Response('Error accessing storage bucket', { status: 500 });
    }
    if (!object) {
      console.error('Object not found in bucket for key:', key);
      return new Response('Not found', { status: 404 });
    }

    let data;
    try {
      data = await object.arrayBuffer();
    } catch (bufferError) {
      console.error('Failed to read object as arrayBuffer:', bufferError);
      return new Response('Failed to read object data', { status: 500 });
    }
    const contentType = object.httpMetadata?.contentType ?? '';

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Unexpected error in image GET:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

