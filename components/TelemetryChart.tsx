'use client';

import React, { useEffect, useRef } from 'react';

export interface DataPoint {
  time: string;
  waterlvl: number;
  temperature: number;
}

interface TelemetryChartProps {
  data: DataPoint[];
  showWater: boolean;
  showTemp: boolean;
}

export default function TelemetryChart({ data, showWater, showTemp }: TelemetryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI crisp drawing
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 55, bottom: 40, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (data.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for telemetry data polling...', width / 2, height / 2);
      return;
    }

    // Dynamic Max values
    const maxWaterVal = 1000;
    const maxTempVal = 50;

    // Grid lines & Y-axis labels
    const gridRows = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '11px sans-serif';

    for (let i = 0; i <= gridRows; i++) {
      const ratio = i / gridRows;
      const yPos = padding.top + (i * (chartH / gridRows));
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      // Left Y-axis (Water Level 0 - 1000)
      if (showWater) {
        const waterYVal = Math.round(maxWaterVal * (1 - ratio));
        ctx.fillStyle = '#06b6d4';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${waterYVal}`, padding.left - 8, yPos);
      }

      // Right Y-axis (Temperature 0 - 50°C)
      if (showTemp) {
        const tempYVal = Math.round(maxTempVal * (1 - ratio));
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${tempYVal}°C`, width - padding.right + 8, yPos);
      }
    }

    // X-axis time labels
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const numPoints = data.length;
    const stepX = numPoints > 1 ? chartW / (numPoints - 1) : chartW;

    const labelIndices = [
      0,
      Math.floor(numPoints / 2),
      numPoints - 1
    ].filter((v, idx, self) => self.indexOf(v) === idx && v >= 0 && v < numPoints);

    labelIndices.forEach((idx) => {
      const pt = data[idx];
      const xPos = padding.left + (idx * stepX);
      ctx.fillText(pt.time, xPos, height - padding.bottom + 8);
    });

    // Helper functions for coordinates
    const getX = (index: number) => padding.left + (index * stepX);
    const getWaterY = (val: number) => {
      const clamped = Math.max(0, Math.min(maxWaterVal, val));
      const ratio = clamped / maxWaterVal;
      return padding.top + chartH * (1 - ratio);
    };
    const getTempY = (val: number) => {
      const clamped = Math.max(0, Math.min(maxTempVal, val));
      const ratio = clamped / maxTempVal;
      return padding.top + chartH * (1 - ratio);
    };

    // Draw Water Level Line (Cyan #06b6d4)
    if (showWater && numPoints > 0) {
      const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

      ctx.beginPath();
      ctx.moveTo(getX(0), height - padding.bottom);
      data.forEach((pt, i) => {
        ctx.lineTo(getX(i), getWaterY(pt.waterlvl));
      });
      ctx.lineTo(getX(numPoints - 1), height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getWaterY(pt.waterlvl);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getWaterY(pt.waterlvl);
        ctx.beginPath();
        ctx.arc(x, y, i === numPoints - 1 ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = i === numPoints - 1 ? '#22d3ee' : '#06b6d4';
        ctx.fill();
        if (i === numPoints - 1) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // Draw Temperature Line (Amber #f59e0b)
    if (showTemp && numPoints > 0) {
      const gradTemp = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradTemp.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      gradTemp.addColorStop(1, 'rgba(245, 158, 11, 0.00)');

      ctx.beginPath();
      ctx.moveTo(getX(0), height - padding.bottom);
      data.forEach((pt, i) => {
        ctx.lineTo(getX(i), getTempY(pt.temperature));
      });
      ctx.lineTo(getX(numPoints - 1), height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradTemp;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getTempY(pt.temperature);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getTempY(pt.temperature);
        ctx.beginPath();
        ctx.arc(x, y, i === numPoints - 1 ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = i === numPoints - 1 ? '#fbbf24' : '#f59e0b';
        ctx.fill();
        if (i === numPoints - 1) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

  }, [data, showWater, showTemp]);

  return (
    <div className="w-full h-72 relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
