import { NextResponse } from 'server/response'; // or standard Next.js Response
import fs from 'fs';
import path from 'path';

// Path to a shared server-side data file (or replace this with Prisma / SQLite / MongoDB client)
const dataFilePath = path.join(process.cwd(), 'central_olympics_db.json');

// Helper to read data
function readCentralData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const fileData = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (err) {
    console.error('Error reading central DB:', err);
  }
  return null;
}

// Helper to write data
function writeCentralData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// GET: Fetches data for ALL users globally
export async function GET() {
  const data = readCentralData();
  if (!data) {
    return NextResponse.json({ participants: [], sportsData: {}, sponsors: [] });
  }
  return NextResponse.json(data);
}

// POST: Updates data centrally (Only allowed when admin saves/imports)
export async function POST(request) {
  try {
    const body = await request.json();
    writeCentralData(body);
    return NextResponse.json({ success: true, message: 'Central database updated successfully!' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}