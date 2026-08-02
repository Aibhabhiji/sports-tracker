import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request) {
  try {
    const { players } = await request.json();

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'No player data provided' }, { status: 400 });
    }

    // 1. Temporarily disable foreign key checks to allow clearing parent records
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('TRUNCATE TABLE players');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Map incoming player objects for bulk insert
    const insertValues = players.map((p) => [
      p.name,
      p.sport,
      p.phase,
      p.category,
      p.age,
      p.ageGroup,
      p.flat,
      p.phone,
    ]);

    const query = `
      INSERT INTO players (name, sport, phase, category, age, age_group, flat, phone) 
      VALUES ?
    `;

    const [result] = await db.query(query, [insertValues]);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.affectedRows} players into MySQL!`,
    });
  } catch (error) {
    // Ensure foreign key checks are re-enabled if an error occurs
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.error('Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}