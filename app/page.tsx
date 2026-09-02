'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TelemetryChart, { DataPoint } from '@/components/TelemetryChart';

export default function TelemetryDashboard() {
  // Server telemetry state
  const [currentWater, setCurrentWater] = useState<number>(50);
  const [currentTemp, setCurrentTemp] = useState<number>(25);

  // Slider control states
  const [sliderWater, setSliderWater] = useState<number>(50);
  const [sliderTemp, setSliderTemp] = useState<number>(25);

  // Auto Mock toggle
  const [autoMock, setAutoMock] = useState<boolean>(false);

  // Polling history for chart
  const [history, setHistory] = useState<DataPoint[]>([]);

  // Chart line visibility toggles
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showTemp, setShowTemp] = useState<boolean>(true);

  // Timestamps to prevent 1s polling from overwriting active user edits
  const lastWaterEditTime = useRef<number>(0);
  const lastTempEditTime = useRef<number>(0);

  // Debounce timers for continuous slider dragging
  const waterDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const tempDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // API submit function
  const updateValue = useCallback(async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', val?: number) => {
    try {
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method !== 'DELETE' && val !== undefined) {
        opts.body = JSON.stringify({ value: val });
      }

      const res = await fetch(endpoint, opts);

      if (res.ok) {
        const data = await res.json();

        if (endpoint.includes('waterlvl')) {
          const newWater = Number(data.waterlvl);
          setCurrentWater(newWater);
          setSliderWater(newWater);
        } else if (endpoint.includes('temperature')) {
          const newTemp = Number(data.temperature);
          setCurrentTemp(newTemp);
          setSliderTemp(newTemp);
        }
      }
    } catch (err) {
      console.error(`Error sending ${method} to ${endpoint}:`, err);
    }
  }, []);

  // Polling function that hits read APIs every 3 sec
  const pollApis = useCallback(async () => {
    try {
      const [resWater, resTemp] = await Promise.all([
        fetch('/api/waterlvl', { cache: 'no-store' }),
        fetch('/api/temperature', { cache: 'no-store' })
      ]);

      if (resWater.ok && resTemp.ok) {
        const dataWater = await resWater.json();
        const dataTemp = await resTemp.json();

        const waterVal = Number(dataWater.waterlvl);
        const tempVal = Number(dataTemp.temperature);
        const timestamp = new Date().toLocaleTimeString();

        setCurrentWater(waterVal);
        setCurrentTemp(tempVal);

        // Only sync slider if user hasn't interacted with it in the last 3500ms
        const now = Date.now();
        if (now - lastWaterEditTime.current > 3500) {
          setSliderWater(waterVal);
        }
        if (now - lastTempEditTime.current > 3500) {
          setSliderTemp(tempVal);
        }

        setHistory((prev) => {
          const next = [...prev, { time: timestamp, waterlvl: waterVal, temperature: tempVal }];
          return next.length > 30 ? next.slice(next.length - 30) : next;
        });
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  // Polling timer 3 seconds
  useEffect(() => {
    pollApis();
    const interval = setInterval(pollApis, 3000);
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
  }, [autoMock, currentWater, currentTemp, updateValue]);

  // Handlers for Water slider change
  const handleWaterSliderChange = (newVal: number) => {
    setSliderWater(newVal);
    lastWaterEditTime.current = Date.now();

    if (waterDebounceTimer.current) {
      clearTimeout(waterDebounceTimer.current);
    }
    waterDebounceTimer.current = setTimeout(() => {
      updateValue('/api/waterlvl', 'POST', newVal);
    }, 150);
  };

  // Handlers for Temp slider change
  const handleTempSliderChange = (newVal: number) => {
    setSliderTemp(newVal);
    lastTempEditTime.current = Date.now();

    if (tempDebounceTimer.current) {
      clearTimeout(tempDebounceTimer.current);
    }
    tempDebounceTimer.current = setTimeout(() => {
      updateValue('/api/temperature', 'POST', newVal);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              Water Level & Temperature Telemetry
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live graph polling every 3 seconds
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Polling (3s)
            </div>
            <button
              onClick={() => setAutoMock(!autoMock)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                autoMock
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {autoMock ? 'Auto-Mock: Active' : 'Auto-Mock Values'}
            </button>
          </div>
        </header>

        {/* 1. GRAPH ON TOP */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Live Telemetry Graph</h2>
              <p className="text-xs text-slate-400">Hits read APIs every 3s</p>
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

        {/* 2. Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/20 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Water Level</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{currentWater}</span>
              <span className="text-lg font-semibold text-cyan-400">%</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, currentWater))}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Temperature</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{currentTemp}</span>
              <span className="text-lg font-semibold text-amber-400">°C</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, ((currentTemp + 10) / 90) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 3. SLIDERS AT THE BOTTOM */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
          <h2 className="text-base font-semibold text-slate-200 mb-4 pb-3 border-b border-slate-800/80">
            Controls (Slide to update values)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Water Level Slider */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
                  Water Level
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={sliderWater}
                    onChange={(e) => handleWaterSliderChange(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 text-right px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 rounded"
                  />
                  <span className="text-xs font-bold text-cyan-400">%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={sliderWater}
                onChange={(e) => handleWaterSliderChange(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Presets:</span>
                  {[0, 25, 50, 75, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        lastWaterEditTime.current = Date.now();
                        setSliderWater(val);
                        updateValue('/api/waterlvl', 'POST', val);
                      }}
                      className="px-2 py-0.5 text-xs bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 rounded text-slate-300 transition-colors"
                    >
                      {val}%
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    lastWaterEditTime.current = Date.now();
                    setSliderWater(0);
                    updateValue('/api/waterlvl', 'DELETE');
                  }}
                  className="px-2.5 py-1 text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                  Temperature
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="-10"
                    max="80"
                    value={sliderTemp}
                    onChange={(e) => handleTempSliderChange(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 text-right px-2 py-0.5 text-xs font-mono font-bold text-amber-300 rounded"
                  />
                  <span className="text-xs font-bold text-amber-400">°C</span>
                </div>
              </div>

              <input
                type="range"
                min="-10"
                max="80"
                step="0.5"
                value={sliderTemp}
                onChange={(e) => handleTempSliderChange(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Presets:</span>
                  {[-10, 0, 20, 37, 60].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        lastTempEditTime.current = Date.now();
                        setSliderTemp(val);
                        updateValue('/api/temperature', 'POST', val);
                      }}
                      className="px-2 py-0.5 text-xs bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 rounded text-slate-300 transition-colors"
                    >
                      {val}°C
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    lastTempEditTime.current = Date.now();
                    setSliderTemp(0);
                    updateValue('/api/temperature', 'DELETE');
                  }}
                  className="px-2.5 py-1 text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
