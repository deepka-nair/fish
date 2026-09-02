import fs from 'fs';
import path from 'path';

export interface TelemetryData {
  waterlvl: number;
  temperature: number;
  updatedAt: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'telemetry.json');

const DEFAULT_DATA: TelemetryData = {
  waterlvl: 55,
  temperature: 24.5,
  updatedAt: new Date().toISOString()
};

function ensureDirExists() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getTelemetryData(): TelemetryData {
  try {
    ensureDirExists();
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
      return DEFAULT_DATA;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      waterlvl: typeof parsed.waterlvl === 'number' ? parsed.waterlvl : DEFAULT_DATA.waterlvl,
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_DATA.temperature,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error reading telemetry data:', error);
    return DEFAULT_DATA;
  }
}

export function updateWaterLevel(value: number): TelemetryData {
  ensureDirExists();
  const current = getTelemetryData();
  const updated: TelemetryData = {
    ...current,
    waterlvl: Number(value),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function updateTemperature(value: number): TelemetryData {
  ensureDirExists();
  const current = getTelemetryData();
  const updated: TelemetryData = {
    ...current,
    temperature: Number(value),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function deleteWaterLevel(): TelemetryData {
  ensureDirExists();
  const current = getTelemetryData();
  const updated: TelemetryData = {
    ...current,
    waterlvl: 0,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function deleteTemperature(): TelemetryData {
  ensureDirExists();
  const current = getTelemetryData();
  const updated: TelemetryData = {
    ...current,
    temperature: 0,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
