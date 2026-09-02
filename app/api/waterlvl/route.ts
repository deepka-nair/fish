import { NextResponse } from 'next/server';
import { getTelemetryData, updateWaterLevel, deleteWaterLevel } from '@/lib/store';

// GET /api/waterlvl - Read current water level
export async function GET() {
  const data = getTelemetryData();
  return NextResponse.json({
    success: true,
    waterlvl: data.waterlvl,
    unit: '%',
    updatedAt: data.updatedAt
  });
}

// POST /api/waterlvl - Create/set water level
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const val = body.value !== undefined ? body.value : body.waterlvl;
    if (val === undefined || isNaN(Number(val))) {
      return NextResponse.json({ success: false, error: 'Invalid value provided' }, { status: 400 });
    }
    const updated = updateWaterLevel(Number(val));
    return NextResponse.json({
      success: true,
      message: 'Water level created/updated',
      waterlvl: updated.waterlvl,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to parse JSON body' }, { status: 400 });
  }
}

// PUT /api/waterlvl - Update water level
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const val = body.value !== undefined ? body.value : body.waterlvl;
    if (val === undefined || isNaN(Number(val))) {
      return NextResponse.json({ success: false, error: 'Invalid value provided' }, { status: 400 });
    }
    const updated = updateWaterLevel(Number(val));
    return NextResponse.json({
      success: true,
      message: 'Water level updated',
      waterlvl: updated.waterlvl,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to parse JSON body' }, { status: 400 });
  }
}

// DELETE /api/waterlvl - Reset water level
export async function DELETE() {
  const updated = deleteWaterLevel();
  return NextResponse.json({
    success: true,
    message: 'Water level reset to 0',
    waterlvl: updated.waterlvl,
    updatedAt: updated.updatedAt
  });
}
