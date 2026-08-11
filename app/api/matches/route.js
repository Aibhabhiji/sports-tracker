import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Fetch matches with field projection, pagination, and Edge CDN caching
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50); // Cap at 50 items
    const offset = (page - 1) * limit;
    const sport = searchParams.get('sport');
    const category = searchParams.get('category');

    // Field Projection: Select only required UI fields
    let query = `
      SELECT 
        id, 
        sport, 
        category, 
        round_name AS roundName, 
        player_a AS playerA, 
        player_b AS playerB, 
        score_a AS scoreA, 
        score_b AS scoreB, 
        winner_name AS winnerName, 
        status, 
        scheduled_date AS scheduledDate, 
        scheduled_time AS scheduledTime 
      FROM matches
    `;
    
    const queryParams = [];
    const whereClauses = [];

    if (sport) {
      whereClauses.push('sport = ?');
      queryParams.push(sport);
    }
    if (category) {
      whereClauses.push('category = ?');
      queryParams.push(category);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Pagination
    query += ' ORDER BY id ASC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [rows] = await db.query(query, queryParams);

    // Serve response with Edge CDN caching headers
    return NextResponse.json(
      { data: rows, page, limit },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=59',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update Match Scores in MySQL
export async function PUT(request) {
  try {
    const { matchId, scoreA, scoreB, winnerName, status } = await request.json();

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    await db.query(
      `UPDATE matches 
       SET score_a = ?, score_b = ?, winner_name = ?, status = ? 
       WHERE id = ?`,
      [scoreA, scoreB, winnerName, status, matchId]
    );

    // Return lean response and prevent mutation caching
    return NextResponse.json(
      { success: true, matchId, scoreA, scoreB, winnerName },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}