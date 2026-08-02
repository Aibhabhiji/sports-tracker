import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Explicitly map Vercel's KV/Upstash integration environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const STORAGE_KEY = 'sanvi_olympics_master_data';

// GET: Fetches data globally from cloud storage
export async function GET() {
  try {
    const data = await redis.get(STORAGE_KEY);
    if (!data) {
      return NextResponse.json({ participants: [], sportsData: {}, sponsors: [] });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Redis Read Error:', err);
    return NextResponse.json({ participants: [], sportsData: {}, sponsors: [] }, { status: 500 });
  }
}

// POST: Updates data centrally in cloud storage (Admin only)
export async function POST(request) {
  try {
    const body = await request.json();
    await redis.set(STORAGE_KEY, body);
    return NextResponse.json({ success: true, message: 'Central database updated successfully in the cloud!' });
  } catch (err) {
    console.error('Redis Write Error Details:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}