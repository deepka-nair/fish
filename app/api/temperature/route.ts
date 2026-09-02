import { NextResponse } from 'next/server';
import { getTelemetryData, updateTemperature, deleteTemperature } from '@/lib/store';

// GET /api/temperature - Read current temperature
export async function GET() {
  const data = getTelemetryData();
  return NextResponse.json({
    success: true,
    temperature: data.temperature,
    unit: '°C',
    updatedAt: data.updatedAt
  });
}

// POST /api/temperature - Create/set temperature
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const val = body.value !== undefined ? body.value : body.temperature;
    if (val === undefined || isNaN(Number(val))) {
      return NextResponse.json({ success: false, error: 'Invalid value provided' }, { status: 400 });
    }
    const updated = updateTemperature(Number(val));
    return NextResponse.json({
      success: true,
      message: 'Temperature created/updated',
      temperature: updated.temperature,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to parse JSON body' }, { status: 400 });
  }
}

// PUT /api/temperature - Update temperature
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const val = body.value !== undefined ? body.value : body.temperature;
    if (val === undefined || isNaN(Number(val))) {
      return NextResponse.json({ success: false, error: 'Invalid value provided' }, { status: 400 });
    }
    const updated = updateTemperature(Number(val));
    return NextResponse.json({
      success: true,
      message: 'Temperature updated',
      temperature: updated.temperature,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to parse JSON body' }, { status: 400 });
  }
}

// DELETE /api/temperature - Reset temperature
export async function DELETE() {
  const updated = deleteTemperature();
  return NextResponse.json({
    success: true,
    message: 'Temperature reset to 0',
    temperature: updated.temperature,
    updatedAt: updated.updatedAt
  });
}
