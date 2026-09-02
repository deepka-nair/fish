'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TelemetryChart, { DataPoint } from '@/components/TelemetryChart';

export default function TelemetryDashboard() {
  // Navigation tab: 'dashboard' | 'guide'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guide'>('dashboard');

  // Server telemetry state
  const [currentWater, setCurrentWater] = useState<number>(550);
  const [currentTemp, setCurrentTemp] = useState<number>(24.5);

  // Slider control states
  const [sliderWater, setSliderWater] = useState<number>(550);
  const [sliderTemp, setSliderTemp] = useState<number>(24.5);

  // Auto Mock toggle
  const [autoMock, setAutoMock] = useState<boolean>(false);

  // Polling history for chart
  const [history, setHistory] = useState<DataPoint[]>([]);

  // Chart line visibility toggles
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showTemp, setShowTemp] = useState<boolean>(true);

  // Timestamps to prevent 3s polling from overwriting active user edits
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
      const newWater = Math.max(0, Math.min(1000, Math.round(currentWater + (Math.random() * 40 - 20))));
      const newTemp = Math.max(-10, Math.min(50, Math.round((currentTemp + (Math.random() * 3 - 1.5)) * 10) / 10));

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

  // Threshold alerts flags
  const isWaterAlert = currentWater < 300;
  const isTempAlert = currentTemp < 20;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Tab Navigation */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              Aquaculture Telemetry & Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time monitoring with automated aquaculture threshold alerts
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Switches */}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'guide'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Do&apos;s and Don&apos;ts Guide
              </button>
            </div>

            <button
              onClick={() => setAutoMock(!autoMock)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                autoMock
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {autoMock ? 'Auto-Mock: Active' : 'Auto-Mock Values'}
            </button>
          </div>
        </header>

        {/* EMERGENCY ALERTS BANNER SECTION */}
        {(isWaterAlert || isTempAlert) && (
          <section className="space-y-4">
            
            {/* Water Level Critical Alert */}
            {isWaterAlert && (
              <div className="bg-rose-950/80 border-2 border-rose-500/80 rounded-xl p-5 shadow-2xl shadow-rose-950/50 backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-400 shrink-0 mt-0.5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-rose-200 tracking-wide">
                      CRITICAL ALERT: Water level has dropped below 300! Fish life might be in danger!
                    </h3>
                    <p className="text-xs text-rose-300/90 leading-relaxed">
                      Current Water Level: <span className="font-mono font-bold text-white underline">{currentWater} units</span> (Critical threshold: 300 units). Low water levels reduce dissolved oxygen volume, increase toxicity concentrations, and cause severe physiological stress.
                    </p>

                    <div className="bg-slate-950/80 border border-rose-900/60 rounded-lg p-3 mt-2">
                      <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Immediate Remedial Actions (How to Improvise)
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                        <li>Activate auxiliary water inlet pumps or open manual top-up lines immediately to restore depth above 300 units.</li>
                        <li>Inspect tank liners, drainage valves, and external pipe joints for physical leaks or blockages.</li>
                        <li>Engage emergency surface splashers and air diffusers to prevent oxygen depletion in the remaining water volume.</li>
                        <li>Temporarily suspend fish feeding to prevent ammonia accumulation until water volume is restored.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Temperature Low Alert */}
            {isTempAlert && (
              <div className="bg-amber-950/80 border-2 border-amber-500/80 rounded-xl p-5 shadow-2xl shadow-amber-950/50 backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 shrink-0 mt-0.5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-amber-200 tracking-wide">
                      TEMPERATURE WARNING: Water temperature has dropped below 20°C (Aquaculture Safety Limit)!
                    </h3>
                    <p className="text-xs text-amber-300/90 leading-relaxed">
                      Current Temperature: <span className="font-mono font-bold text-white underline">{currentTemp} °C</span> (Safe range: 20°C - 30°C). Cold water temperatures slow down fish digestion, suppress immune functions, and expose fish to fungal pathogens.
                    </p>

                    <div className="bg-slate-950/80 border border-amber-900/60 rounded-lg p-3 mt-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Immediate Remedial Actions (How to Improvise)
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                        <li>Turn on submersible aquatic water heaters or inline heat exchangers to raise temperature back to 22°C - 28°C.</li>
                        <li>Cover tank or pond surfaces with thermal insulation sheets or poly-tunnels to restrict heat dissipation.</li>
                        <li>Reduce feeding rations by 50-70% as fish metabolic rate drops drastically in cold water.</li>
                        <li>Avoid adding unheated fresh water; pre-temper incoming replacement water before exchange.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </section>
        )}

        {/* TAB CONTENT 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
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
                    Water Level (0-1000)
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
                    Temperature (°C)
                  </button>
                </div>
              </div>

              <TelemetryChart data={history} showWater={showWater} showTemp={showTemp} />
            </section>

            {/* 2. Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Water Card */}
              <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border rounded-xl p-5 shadow-lg transition-all ${
                isWaterAlert ? 'border-rose-500/80 shadow-rose-950/30' : 'border-cyan-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Water Level</span>
                  {isWaterAlert && (
                    <span className="text-[10px] bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2 py-0.5 rounded font-bold">
                      BELOW THRESHOLD (300)
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{currentWater}</span>
                  <span className="text-lg font-semibold text-cyan-400">units</span>
                </div>
                <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isWaterAlert ? 'bg-rose-500' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (currentWater / 1000) * 100))}%` }}
                  ></div>
                </div>
              </div>

              {/* Temperature Card */}
              <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border rounded-xl p-5 shadow-lg transition-all ${
                isTempAlert ? 'border-amber-500/80 shadow-amber-950/30' : 'border-amber-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Temperature</span>
                  {isTempAlert && (
                    <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-bold">
                      BELOW SAFE TEMP (20°C)
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{currentTemp}</span>
                  <span className="text-lg font-semibold text-amber-400">°C</span>
                </div>
                <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isTempAlert ? 'bg-amber-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, ((currentTemp + 10) / 60) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* SEPARATE ALERT STATUS TABLE */}
            <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Aquaculture Threshold Alert Status Table
                </h3>
                <span className="text-xs text-slate-400">Live parameter evaluation</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Telemetry Parameter</th>
                      <th className="py-2.5 px-3">Current Value</th>
                      <th className="py-2.5 px-3">Safe Threshold</th>
                      <th className="py-2.5 px-3">Alert Status</th>
                      <th className="py-2.5 px-3">Fish Health Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    
                    {/* Row 1: Water Level */}
                    <tr className={isWaterAlert ? 'bg-rose-950/20' : ''}>
                      <td className="py-3 px-3 font-semibold text-cyan-300">Water Level</td>
                      <td className="py-3 px-3 text-white font-bold">{currentWater} units</td>
                      <td className="py-3 px-3 text-slate-400">&ge; 300 units</td>
                      <td className="py-3 px-3">
                        {isWaterAlert ? (
                          <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded font-bold">
                            CRITICAL LOW (&lt;300)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded font-bold">
                            OPTIMAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        {isWaterAlert ? (
                          <span className="text-rose-400 font-bold">High Hazard (Suffocation / Stress)</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">Low Risk</span>
                        )}
                      </td>
                    </tr>

                    {/* Row 2: Water Temperature */}
                    <tr className={isTempAlert ? 'bg-amber-950/20' : ''}>
                      <td className="py-3 px-3 font-semibold text-amber-300">Water Temperature</td>
                      <td className="py-3 px-3 text-white font-bold">{currentTemp} °C</td>
                      <td className="py-3 px-3 text-slate-400">20°C - 30°C</td>
                      <td className="py-3 px-3">
                        {isTempAlert ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-bold">
                            COLD WARNING (&lt;20°C)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded font-bold">
                            SAFE RANGE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        {isTempAlert ? (
                          <span className="text-amber-400 font-bold">Moderate Hazard (Suppressed Immunity)</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">Optimal Metabolism</span>
                        )}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </section>

            {/* SEPARATE DO'S & DON'TS QUICK SUMMARY BOX FOR FISH HEALTH */}
            <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Essential Do&apos;s and Don&apos;ts to Preserve Fish Health
                </h3>
                <button
                  onClick={() => setActiveTab('guide')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
                >
                  View Detailed Guide &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DO'S BOX */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    DO&apos;S (Fish Survival Rules)
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Maintain water level &ge; 300 units at all times.</li>
                    <li>Keep water temperature between 22°C and 28°C.</li>
                    <li>Run aerators continuously to keep Dissolved Oxygen &gt; 5.0 mg/L.</li>
                    <li>Test pH (6.5-8.5) and ammonia levels daily.</li>
                    <li>Feed 2-3% biomass daily and scoop out unconsumed feed.</li>
                  </ul>
                </div>

                {/* DON'TS BOX */}
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    DON&apos;TS (Critical Hazards to Avoid)
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Don&apos;t allow water level to drop below 300 units.</li>
                    <li>Don&apos;t expose fish to cold shocks under 20°C.</li>
                    <li>Don&apos;t overfeed (prevents toxic ammonia $NH_3$ spikes).</li>
                    <li>Don&apos;t exceed stocking density per cubic meter.</li>
                    <li>Don&apos;t add raw chlorinated tap water directly.</li>
                  </ul>
                </div>

              </div>
            </section>

            {/* 3. SLIDERS AT THE BOTTOM */}
            <section className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="text-base font-semibold text-slate-200 mb-4 pb-3 border-b border-slate-800/80">
                Mock Telemetry Controllers (Slide to test alert thresholds)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Water Level Slider */}
                <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
                      Water Level (0 - 1000)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={sliderWater}
                        onChange={(e) => handleWaterSliderChange(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-slate-700 text-right px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 rounded"
                      />
                      <span className="text-xs font-bold text-cyan-400">units</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="5"
                    value={sliderWater}
                    onChange={(e) => handleWaterSliderChange(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-500">Presets:</span>
                      {[150, 280, 500, 750, 1000].map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            lastWaterEditTime.current = Date.now();
                            setSliderWater(val);
                            updateValue('/api/waterlvl', 'POST', val);
                          }}
                          className={`px-2 py-0.5 text-xs border rounded transition-colors ${
                            val < 300
                              ? 'bg-rose-950/50 hover:bg-rose-900 border-rose-700 text-rose-300'
                              : 'bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border-slate-700 text-slate-300'
                          }`}
                        >
                          {val}
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
                      Reset (0)
                    </button>
                  </div>
                </div>

                {/* Temperature Slider */}
                <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      Temperature (-10°C to 50°C)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="-10"
                        max="50"
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
                    max="50"
                    step="0.5"
                    value={sliderTemp}
                    onChange={(e) => handleTempSliderChange(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-500">Presets:</span>
                      {[12, 18, 25, 32, 45].map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            lastTempEditTime.current = Date.now();
                            setSliderTemp(val);
                            updateValue('/api/temperature', 'POST', val);
                          }}
                          className={`px-2 py-0.5 text-xs border rounded transition-colors ${
                            val < 20
                              ? 'bg-amber-950/50 hover:bg-amber-900 border-amber-700 text-amber-300'
                              : 'bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border-slate-700 text-slate-300'
                          }`}
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
                      Reset (0)
                    </button>
                  </div>
                </div>

              </div>
            </section>

          </div>
        )}

        {/* TAB CONTENT 2: AQUACULTURE DO'S & DON'TS GUIDE */}
        {activeTab === 'guide' && (
          <section className="space-y-6">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-6 shadow-xl space-y-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Aquaculture Best Practices: Do&apos;s and Don&apos;ts
              </h2>
              <p className="text-xs text-slate-400">
                Essential operational standards to protect fish health, maximize growth rates, and prevent environmental collapse.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* DO'S COLUMN */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-emerald-500/20">
                  <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <h3 className="text-base font-bold text-emerald-300 tracking-wide uppercase">
                    DO&apos;S (Recommended Practices)
                  </h3>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="bg-slate-900/90 p-3 rounded-lg border border-emerald-900/40 space-y-1">
                    <span className="font-bold text-emerald-400 block">1. Maintain Water Levels Above Safety Thresholds</span>
                    <p className="text-slate-400">Keep water depth above 300 units to ensure adequate swimming space, prevent overcrowding stress, and stabilize dissolved oxygen capacity.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-emerald-900/40 space-y-1">
                    <span className="font-bold text-emerald-400 block">2. Keep Temperatures in the Optimal Range (22°C - 28°C)</span>
                    <p className="text-slate-400">Regulate aquatic temperatures using heaters or shade nets to promote active metabolism, high feed conversion, and robust immune health.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-emerald-900/40 space-y-1">
                    <span className="font-bold text-emerald-400 block">3. Run Continuous Aeration & Monitor Dissolved Oxygen</span>
                    <p className="text-slate-400">Operate paddlewheels or air diffusers continuously to maintain dissolved oxygen levels above 5.0 mg/L, especially during early morning hours.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-emerald-900/40 space-y-1">
                    <span className="font-bold text-emerald-400 block">4. Conduct Daily Water Quality Testing</span>
                    <p className="text-slate-400">Regularly test pH (ideal 6.5 - 8.5), total ammonia nitrogen (&lt;0.05 mg/L), and alkalinity (&gt;80 mg/L) to spot water degradation early.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-emerald-900/40 space-y-1">
                    <span className="font-bold text-emerald-400 block">5. Practice Controlled Ration Feeding</span>
                    <p className="text-slate-400">Feed high-quality floating pellets calculated at 2-3% of total body biomass. Scoop out unconsumed feed after 15-20 minutes.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-emerald-900/40 space-y-1">
                    <span className="font-bold text-emerald-400 block">6. Perform Partial Gradual Water Exchanges</span>
                    <p className="text-slate-400">Exchange 10-15% of tank water weekly using pre-conditioned, de-chlorinated water to reduce nitrate build-up without shocking fish.</p>
                  </li>
                </ul>
              </div>

              {/* DON'TS COLUMN */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-rose-500/20">
                  <span className="p-1.5 bg-rose-500/20 text-rose-400 rounded-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <h3 className="text-base font-bold text-rose-300 tracking-wide uppercase">
                    DON&apos;TS (Critical Hazards to Avoid)
                  </h3>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="bg-slate-900/90 p-3 rounded-lg border border-rose-900/40 space-y-1">
                    <span className="font-bold text-rose-400 block">1. Don&apos;t Allow Water Level to Drop Below 300 Units</span>
                    <p className="text-slate-400">Never allow water level to plunge below safety limits. Low volume accelerates temperature swings, waste concentration, and asphyxiation.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-rose-900/40 space-y-1">
                    <span className="font-bold text-rose-400 block">2. Don&apos;t Ignore Cold Water Thermal Shocks (&lt;20°C)</span>
                    <p className="text-slate-400">Avoid exposing tropical aquatic species to unheated water under 20°C. Cold stress shuts down digestion and triggers disease outbreaks.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-rose-900/40 space-y-1">
                    <span className="font-bold text-rose-400 block">3. Don&apos;t Overfeed Fish</span>
                    <p className="text-slate-400">Excess feed sinks to the bottom, decomposes anaerobically, and spikes un-ionized toxic ammonia (NH3) levels rapidly.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-rose-900/40 space-y-1">
                    <span className="font-bold text-rose-400 block">4. Don&apos;t Exceed Maximum Stocking Density</span>
                    <p className="text-slate-400">Avoid over-populating tanks beyond aeration and biological filter capacity. Overcrowding leads to fin erosion and rapid pathogen transmission.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-rose-900/40 space-y-1">
                    <span className="font-bold text-rose-400 block">5. Don&apos;t Use Raw Untreated Tap Water</span>
                    <p className="text-slate-400">Never pump tap water containing chlorine or chloramines directly into fish tanks. Chlorine destroys gill filaments instantly.</p>
                  </li>

                  <li className="bg-slate-900/90 p-3 rounded-lg border border-rose-900/40 space-y-1">
                    <span className="font-bold text-rose-400 block">6. Don&apos;t Disturb Fish During Low Temperature Spikes</span>
                    <p className="text-slate-400">Do not net, sample, or move fish when water temperatures are low (&lt;20°C), as handling damages their protective mucus coat.</p>
                  </li>
                </ul>
              </div>

            </div>
          </section>
        )}

      </div>
    </div>
  );
}
