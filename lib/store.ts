export interface TelemetryRecord {
  waterlvl: number;
  temperature: number;
  updatedAt: string;
}

export interface TelemetryStoreState {
  current: TelemetryRecord;
  historyQueue: TelemetryRecord[]; // Bounded FIFO Queue (max 60 elements)
}

const MAX_QUEUE_SIZE = 60;

// Persistent global in-memory store across Next.js dev reloads
const globalStore = (globalThis as unknown as { __telemetryStore?: TelemetryStoreState });

if (!globalStore.__telemetryStore) {
  const initialRecord: TelemetryRecord = {
    waterlvl: 55,
    temperature: 24.5,
    updatedAt: new Date().toISOString()
  };
  globalStore.__telemetryStore = {
    current: initialRecord,
    historyQueue: [initialRecord]
  };
}

const store = globalStore.__telemetryStore;

function pushToQueue(waterlvl: number, temperature: number): TelemetryRecord {
  const record: TelemetryRecord = {
    waterlvl: Number(waterlvl),
    temperature: Number(temperature),
    updatedAt: new Date().toISOString()
  };
  
  store.current = record;
  store.historyQueue.push(record);

  // Maintain queue capacity of last 60 values (dequeue oldest from front)
  while (store.historyQueue.length > MAX_QUEUE_SIZE) {
    store.historyQueue.shift();
  }

  return record;
}

export function getTelemetryData(): TelemetryRecord & { historyQueue: TelemetryRecord[] } {
  return {
    ...store.current,
    historyQueue: [...store.historyQueue]
  };
}

export function updateWaterLevel(value: number): TelemetryRecord {
  return pushToQueue(value, store.current.temperature);
}

export function updateTemperature(value: number): TelemetryRecord {
  return pushToQueue(store.current.waterlvl, value);
}

export function deleteWaterLevel(): TelemetryRecord {
  return pushToQueue(0, store.current.temperature);
}

export function deleteTemperature(): TelemetryRecord {
  return pushToQueue(store.current.waterlvl, 0);
}
