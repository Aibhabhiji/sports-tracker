import { NextResponse } from 'next/server';
import db from '@/lib/db';

const BATCH_SIZE = 500; // Optimal batch size for serverless execution and MySQL packet limits

export async function POST(request) {
  try {
    const { players } = await request.json();

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'No player data provided' }, { status: 400 });
    }

    // 1. Sanitize and prepare bulk values array
    const insertValues = players.map((p) => [
      p.name || null,
      p.sport || p.gameChoice || null,
      p.phase || null,
      p.category || null,
      p.age !== undefined && p.age !== null && p.age !== '' ? parseInt(p.age, 10) : null,
      p.ageGroup || p.age_group || null,
      p.flat || null,
      p.phone || null,
    ]);

    // 2. Clear old table data safely
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('TRUNCATE TABLE players');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    let totalInserted = 0;

    // 3. Batch insert in chunks to avoid packet overflow
    for (let i = 0; i < insertValues.length; i += BATCH_SIZE) {
      const chunk = insertValues.slice(i, i + BATCH_SIZE);
      const query = `
        INSERT INTO players (name, sport, phase, category, age, age_group, flat, phone) 
        VALUES ?
      `;
      const [result] = await db.query(query, [chunk]);
      totalInserted += result.affectedRows;
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${totalInserted} players into MySQL!`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    // Guaranteed fallback to restore foreign key checks on error
    try {
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (restoreError) {
      console.error('Failed to restore foreign key checks:', restoreError);
    }
    
    console.error('Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}