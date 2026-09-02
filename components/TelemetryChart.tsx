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

    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (data.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for telemetry data polling...', width / 2, height / 2);
      return;
    }

    // Grid lines & Y-axis labels (0 to 100)
    const gridRows = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridRows; i++) {
      const yVal = 100 - (i * 20);
      const yPos = padding.top + (i * (chartH / gridRows));
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      // Label
      ctx.fillText(`${yVal}`, padding.left - 10, yPos);
    }

    // X-axis time labels (show first, middle, last)
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

    // Helper to calculate X and Y pixel positions
    const getX = (index: number) => padding.left + (index * stepX);
    const getY = (val: number, max: number = 100, min: number = 0) => {
      const clamped = Math.max(min, Math.min(max, val));
      const ratio = (clamped - min) / (max - min);
      return padding.top + chartH * (1 - ratio);
    };

    // Draw Water Level Line (Cyan #06b6d4)
    if (showWater && numPoints > 0) {
      // Gradient fill under curve
      const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

      ctx.beginPath();
      ctx.moveTo(getX(0), height - padding.bottom);
      data.forEach((pt, i) => {
        ctx.lineTo(getX(i), getY(pt.waterlvl));
      });
      ctx.lineTo(getX(numPoints - 1), height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.waterlvl);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points
      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.waterlvl);
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
      // Gradient fill under curve
      const gradTemp = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradTemp.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      gradTemp.addColorStop(1, 'rgba(245, 158, 11, 0.00)');

      ctx.beginPath();
      ctx.moveTo(getX(0), height - padding.bottom);
      data.forEach((pt, i) => {
        ctx.lineTo(getX(i), getY(pt.temperature));
      });
      ctx.lineTo(getX(numPoints - 1), height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradTemp;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.temperature);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points
      data.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt.temperature);
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
