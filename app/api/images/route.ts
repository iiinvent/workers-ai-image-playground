import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET() {
  try {
    const context = getRequestContext();
    const { BUCKET } = context.env;
    const options = { limit: 500 };
    let listed;
    try {
      listed = await BUCKET.list(options);
    } catch (bucketError) {
      console.error('Failed to list objects in bucket:', bucketError);
      return new Response('Failed to list objects in bucket', { status: 500 });
    }
    let truncated = listed.truncated;
    // @ts-ignore
    let cursor = truncated ? listed.cursor : undefined;

    while (truncated) {
      let next;
      try {
        next = await BUCKET.list({
          ...options,
          cursor: cursor,
        });
      } catch (bucketError) {
        console.error('Failed to list objects in bucket (pagination):', bucketError);
        return new Response('Failed to list objects in bucket (pagination)', { status: 500 });
      }
      listed.objects.push(...next.objects);
      truncated = next.truncated;
      // @ts-ignore
      cursor = next.cursor;
    }

    return new Response(JSON.stringify(listed.objects), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Unexpected error in images GET:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

