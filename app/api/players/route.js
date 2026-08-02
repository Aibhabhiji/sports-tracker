import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET all players
export async function GET() {
  try {
    const [rows] = await db.query('SELECT * FROM players ORDER BY name ASC');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST new player
export async function POST(request) {
  try {
    const { name, age, phase, gender, flat_number } = await request.json();
    const [result] = await db.query(
      'INSERT INTO players (name, age, phase, gender, flat_number) VALUES (?, ?, ?, ?, ?)',
      [name, age, phase, gender, flat_number]
    );
    return NextResponse.json({ id: result.insertId, name, age, phase, gender, flat_number });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}