import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Fetch players with field projection, pagination, and Edge CDN caching
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100); // Cap at max 100 items
    const offset = (page - 1) * limit;
    const search = searchParams.get('search');
    const phase = searchParams.get('phase');

    // Field Projection: Select explicit UI columns instead of SELECT *
    let query = `
      SELECT id, name, age, phase, gender, flat_number AS flatNumber
      FROM players
    `;

    const queryParams = [];
    const whereClauses = [];

    if (search) {
      whereClauses.push('name LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (phase) {
      whereClauses.push('phase = ?');
      queryParams.push(phase);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [rows] = await db.query(query, queryParams);

    // Return with Edge CDN Cache-Control headers
    return NextResponse.json(
      { data: rows, page, limit },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new player with validation and no-store headers
export async function POST(request) {
  try {
    const { name, age, phase, gender, flat_number } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const [result] = await db.query(
      'INSERT INTO players (name, age, phase, gender, flat_number) VALUES (?, ?, ?, ?, ?)',
      [name, age, phase, gender, flat_number]
    );

    return NextResponse.json(
      { id: result.insertId, name, age, phase, gender, flat_number },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}