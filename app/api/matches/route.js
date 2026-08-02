import { NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT: Update Match Scores in MySQL
export async function PUT(request) {
  try {
    const { matchId, scoreA, scoreB, winnerName, status } = await request.json();

    await db.query(
      `UPDATE matches 
       SET score_a = ?, score_b = ?, winner_name = ?, status = ? 
       WHERE id = ?`,
      [scoreA, scoreB, winnerName, status, matchId]
    );

    return NextResponse.json({ success: true, matchId, scoreA, scoreB, winnerName });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}