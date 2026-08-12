import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const url = process.env.STORAGE_REST_API_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.STORAGE_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Safely initialize Redis client only if credentials exist
const redis = (url && token) ? new Redis({ url, token }) : null;

const STORAGE_KEY = 'sanvi_olympics_master_data';

// GET: Fetches data globally with CDN caching and selective section filtering
export async function GET(request) {
  try {
    if (!redis) {
      console.warn('Upstash Redis environment variables are missing in .env');
      return NextResponse.json(
        { participants: [], sportsData: {}, sponsors: [] },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section'); // e.g. 'participants', 'sportsData', or 'sponsors'

    const data = await redis.get(STORAGE_KEY);
    
    if (!data) {
      return NextResponse.json(
        { participants: [], sportsData: {}, sponsors: [] },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
          },
        }
      );
    }

    // Payload optimization: Return only requested sub-section if specified
    let responseData = data;
    if (section && data[section] !== undefined) {
      responseData = { [section]: data[section] };
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=59',
      },
    });
  } catch (err) {
    console.error('Redis Read Error:', err);
    return NextResponse.json(
      { participants: [], sportsData: {}, sponsors: [] },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

// POST: Updates central database in Redis (Admin only)
export async function POST(request) {
  try {
    if (!redis) {
      return NextResponse.json(
        { success: false, error: 'Redis environment variables are missing in .env' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid data payload' }, { status: 400 });
    }

    await redis.set(STORAGE_KEY, body);

    return NextResponse.json(
      { success: true, message: 'Central database updated successfully in the cloud!' },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('Redis Write Error Details:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}