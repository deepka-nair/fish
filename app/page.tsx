'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TelemetryChart, { DataPoint } from '@/components/TelemetryChart';

interface ApiLog {
  id: string;
  time: string;
  method: string;
  endpoint: string;
  status: number;
  latencyMs: number;
}

export default function TelemetryDashboard() {
  // Telemetry state from server
  const [currentWater, setCurrentWater] = useState<number>(50);
  const [currentTemp, setCurrentTemp] = useState<number>(25);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Slider control states (for local immediate drag before API hit)
  const [sliderWater, setSliderWater] = useState<number>(50);
  const [sliderTemp, setSliderTemp] = useState<number>(25);

  // Auto Mock toggle (randomly fluctuates values over time if enabled)
  const [autoMock, setAutoMock] = useState<boolean>(false);

  // Polling history for chart
  const [history, setHistory] = useState<DataPoint[]>([]);

  // Chart line visibility toggles
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showTemp, setShowTemp] = useState<boolean>(true);

  // Api Logs
  const [logs, setLogs] = useState<ApiLog[]>([]);

  // Track dragging to avoid overriding slider during manual adjustment
  const isDraggingWater = useRef(false);
  const isDraggingTemp = useRef(false);

  const addLog = useCallback((method: string, endpoint: string, status: number, latencyMs: number) => {
    const newLog: ApiLog = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
      method,
      endpoint,
      status,
      latencyMs
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  }, []);

  // Polling function that hits read APIs every 1 sec
  const pollApis = useCallback(async () => {
    const startTime = performance.now();
    try {
      const [resWater, resTemp] = await Promise.all([
        fetch('/api/waterlvl', { cache: 'no-store' }),
        fetch('/api/temperature', { cache: 'no-store' })
      ]);
      const latency = Math.round(performance.now() - startTime);

      if (resWater.ok && resTemp.ok) {
        const dataWater = await resWater.json();
        const dataTemp = await resTemp.json();

        const waterVal = Number(dataWater.waterlvl);
        const tempVal = Number(dataTemp.temperature);
        const timestamp = new Date().toLocaleTimeString();

        setCurrentWater(waterVal);
        setCurrentTemp(tempVal);
        setLastUpdated(dataWater.updatedAt || dataTemp.updatedAt || new Date().toISOString());

        if (!isDraggingWater.current) setSliderWater(waterVal);
        if (!isDraggingTemp.current) setSliderTemp(tempVal);

        setHistory((prev) => {
          const next = [...prev, { time: timestamp, waterlvl: waterVal, temperature: tempVal }];
          return next.length > 30 ? next.slice(next.length - 30) : next;
        });

        addLog('GET', '/api/waterlvl & /api/temperature', 200, latency);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [addLog]);

  // Polling timer 1 second
  useEffect(() => {
    pollApis();
    const interval = setInterval(pollApis, 1000);
    return () => clearInterval(interval);
  }, [pollApis]);

  // Auto Mock timer (updates values randomly every 3s if enabled)
  useEffect(() => {
    if (!autoMock) return;
    const mockInterval = setInterval(async () => {
      const newWater = Math.max(0, Math.min(100, Math.round((currentWater + (Math.random() * 8 - 4)) * 10) / 10));
      const newTemp = Math.max(-10, Math.min(60, Math.round((currentTemp + (Math.random() * 4 - 2)) * 10) / 10));

      await Promise.all([
        updateValue('/api/waterlvl', 'POST', newWater),
        updateValue('/api/temperature', 'POST', newTemp)
      ]);
    }, 3000);
    return () => clearInterval(mockInterval);
  }, [autoMock, currentWater, currentTemp]);

  // API submit function
  const updateValue = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', val?: number) => {
    const startTime = performance.now();
    try {
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method !== 'DELETE' && val !== undefined) {
        opts.body = JSON.stringify({ value: val });
      }

      const res = await fetch(endpoint, opts);
      const latency = Math.round(performance.now() - startTime);
      addLog(method, endpoint, res.status, latency);

      if (res.ok) {
        // Immediate poll refresh
        pollApis();
      }
    } catch (err) {
      console.error(`Error sending ${method} to ${endpoint}:`, err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              Telemetry Dashboard & Mock API
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time JSON backend polling every 1.0s with CRUD controls
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Polling (1s)
            </div>
            <button
              onClick={() => setAutoMock(!autoMock)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide border transition-all duration-200 ${
                autoMock
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {autoMock ? 'Auto-Mock: Active' : 'Enable Auto-Mock Generator'}
            </button>
          </div>
        </header>

        {/* Top Control Panel: Sliders & Quick Mock Buttons */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Mock API Controllers (Update via POST / PUT / DELETE)
            </h2>
            <span className="text-xs text-slate-400">Adjust sliders or use buttons to edit server values</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Water Level Control */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Water Level Control
                </label>
                <span className="text-sm font-bold font-mono text-cyan-300">{sliderWater}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={sliderWater}
                onMouseDown={() => (isDraggingWater.current = true)}
                onMouseUp={() => {
                  isDraggingWater.current = false;
                  updateValue('/api/waterlvl', 'POST', sliderWater);
                }}
                onTouchEnd={() => {
                  isDraggingWater.current = false;
                  updateValue('/api/waterlvl', 'POST', sliderWater);
                }}
                onChange={(e) => setSliderWater(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Presets:</span>
                  {[10, 35, 60, 90].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        setSliderWater(val);
                        updateValue('/api/waterlvl', 'POST', val);
                      }}
                      className="px-2 py-0.5 text-xs bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 rounded text-slate-300 transition-colors"
                    >
                      {val}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateValue('/api/waterlvl', 'PUT', sliderWater)}
                    className="px-2.5 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors"
                  >
                    PUT
                  </button>
                  <button
                    onClick={() => updateValue('/api/waterlvl', 'DELETE')}
                    className="px-2 py-1 text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition-colors"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </div>

            {/* Temperature Control */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wider text-amber-400 uppercase flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Temperature Control
                </label>
                <span className="text-sm font-bold font-mono text-amber-300">{sliderTemp} °C</span>
              </div>

              <input
                type="range"
                min="-10"
                max="80"
                step="0.5"
                value={sliderTemp}
                onMouseDown={() => (isDraggingTemp.current = true)}
                onMouseUp={() => {
                  isDraggingTemp.current = false;
                  updateValue('/api/temperature', 'POST', sliderTemp);
                }}
                onTouchEnd={() => {
                  isDraggingTemp.current = false;
                  updateValue('/api/temperature', 'POST', sliderTemp);
                }}
                onChange={(e) => setSliderTemp(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Presets:</span>
                  {[0, 18, 30, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        setSliderTemp(val);
                        updateValue('/api/temperature', 'POST', val);
                      }}
                      className="px-2 py-0.5 text-xs bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 rounded text-slate-300 transition-colors"
                    >
                      {val}°C
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateValue('/api/temperature', 'PUT', sliderTemp)}
                    className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-colors"
                  >
                    PUT
                  </button>
                  <button
                    onClick={() => updateValue('/api/temperature', 'DELETE')}
                    className="px-2 py-1 text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition-colors"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Current Readout Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/20 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Current Water Level</span>
              <span className="text-xs text-slate-400 font-mono">GET /api/waterlvl</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{currentWater}</span>
              <span className="text-lg font-semibold text-cyan-400">%</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, currentWater))}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Current Temperature</span>
              <span className="text-xs text-slate-400 font-mono">GET /api/temperature</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{currentTemp}</span>
              <span className="text-lg font-semibold text-amber-400">°C</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, ((currentTemp + 10) / 90) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Live Chart Section */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Live Telemetry Variation Graph</h2>
              <p className="text-xs text-slate-400">Real-time data stream updated every 1000ms</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWater(!showWater)}
                className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors flex items-center gap-1.5 ${
                  showWater
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Water Level
              </button>
              <button
                onClick={() => setShowTemp(!showTemp)}
                className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors flex items-center gap-1.5 ${
                  showTemp
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500 line-through'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Temperature
              </button>
            </div>
          </div>

          <TelemetryChart data={history} showWater={showWater} showTemp={showTemp} />
        </section>

        {/* JSON File Inspector & Live HTTP Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* JSON File Preview */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Stored JSON File State (data/telemetry.json)
              </h3>
              <span className="text-xs text-slate-500 font-mono">Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto flex-1">
{JSON.stringify(
  {
    waterlvl: currentWater,
    temperature: currentTemp,
    updatedAt: lastUpdated
  },
  null,
  2
)}
            </pre>
          </div>

          {/* API Activity Log */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Live API Activity Log
              </h3>
              <span className="text-xs text-slate-500">Recent HTTP requests</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex-1 overflow-y-auto max-h-56 space-y-2 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-4">No API requests recorded yet</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-slate-900 pb-1 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{log.time}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.method === 'GET' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        log.method === 'POST' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        log.method === 'PUT' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {log.method}
                      </span>
                      <span className="text-slate-400">{log.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">{log.status} OK</span>
                      <span className="text-slate-600">{log.latencyMs}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
