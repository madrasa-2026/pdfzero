import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  calculateDistance,
  calculatePathLength,
  calculatePolygonArea,
  calibrateScale,
  formatMeasurementValue,
  burnMeasurementsToPdf,
  exportTakeoffCsv,
  type MeasurementItem,
} from '../../src/lib/pdf/measureEngine';

describe('PDF Measurement & Architectural Scale Calibrator Engine', () => {
  it('accurately calculates 2D Euclidean distance', () => {
    // 3-4-5 triangle
    const d = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(d).toBe(5);

    // Horizontal & vertical lines
    expect(calculateDistance({ x: 10, y: 20 }, { x: 110, y: 20 })).toBe(100);
    expect(calculateDistance({ x: 50, y: 10 }, { x: 50, y: 60 })).toBe(50);
  });

  it('calculates total polyline path length', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];
    // Open path: 10 + 20 + 10 = 40
    expect(calculatePathLength(points, false)).toBe(40);
    // Closed perimeter: 40 + 20 = 60
    expect(calculatePathLength(points, true)).toBe(60);
  });

  it('calculates polygon area using Shoelace algorithm', () => {
    // 100 x 50 rectangle
    const rectPoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    expect(calculatePolygonArea(rectPoints)).toBe(5000);

    // Triangle: base 60, height 40 -> area 1200
    const trianglePoints = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 30, y: 40 },
    ];
    expect(calculatePolygonArea(trianglePoints)).toBe(1200);
  });

  it('calibrates scale ratio from reference points and known real distance', () => {
    // 200 points on screen represents 10 meters in real world
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 100 };
    const cal = calibrateScale(p1, p2, 10, 'm');

    expect(cal.isCalibrated).toBe(true);
    expect(cal.pixelDistance).toBe(200);
    expect(cal.scaleRatio).toBe(0.05); // 10 m / 200 pt = 0.05 m per pt

    // Test error cases
    expect(() => calibrateScale(p1, p2, 0, 'm')).toThrow('Reference calibration distance must be greater than zero.');
    expect(() => calibrateScale(p1, p1, 10, 'm')).toThrow('Reference points are too close together to calibrate scale accurately.');
  });

  it('formats metric and imperial measurement values', () => {
    expect(formatMeasurementValue(15.5, 'm')).toBe('15.50 m');
    expect(formatMeasurementValue(250.75, 'm', true)).toBe('250.75 m²');
    expect(formatMeasurementValue(12.5, 'ft')).toBe('12\' 6" (12.50 ft)');
    expect(formatMeasurementValue(1440, 'ft', true)).toBe('1440.00 sq ft');
  });

  it('serializes takeoff measurements into valid CSV', () => {
    const measurements: MeasurementItem[] = [
      {
        id: 'M1',
        label: 'Living Room North Wall',
        type: 'distance',
        points: [{ x: 10, y: 10 }, { x: 110, y: 10 }],
        rawPointsValue: 100,
        realValue: 5.0,
        formattedString: '5.00 m',
        color: '#2563eb',
      },
      {
        id: 'M2',
        label: 'Master Bedroom Area',
        type: 'area',
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 }],
        rawPointsValue: 8000,
        realValue: 20.0,
        formattedString: '20.00 m²',
        color: '#059669',
      },
    ];

    const cal = calibrateScale({ x: 0, y: 0 }, { x: 100, y: 0 }, 5, 'm');
    const csv = exportTakeoffCsv(measurements, cal);

    expect(csv).toContain('ID,Label,Type,Value,Unit,Scale Ratio,Timestamp');
    expect(csv).toContain('M1,"Living Room North Wall",distance,5.00,m');
    expect(csv).toContain('M2,"Master Bedroom Area",area,20.00,m²');
  });

  it('burns measurement lines and dimension annotations into PDF document', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    page.drawText('Sample Architectural Floor Plan', { x: 50, y: 750, size: 16 });
    const originalBytes = await doc.save();

    const measurements: MeasurementItem[] = [
      {
        id: 'D1',
        label: 'Wall A',
        type: 'distance',
        points: [{ x: 50, y: 50 }, { x: 250, y: 50 }],
        rawPointsValue: 200,
        realValue: 10,
        formattedString: '10.00 m',
        color: '#2563eb',
      },
      {
        id: 'A1',
        label: 'Office Area',
        type: 'area',
        points: [{ x: 50, y: 100 }, { x: 250, y: 100 }, { x: 250, y: 300 }, { x: 50, y: 300 }],
        rawPointsValue: 40000,
        realValue: 100,
        formattedString: '100.00 m²',
        color: '#dc2626',
      },
    ];

    const annotatedBytes = await burnMeasurementsToPdf(
      originalBytes,
      0,
      measurements,
      600,
      800
    );

    expect(annotatedBytes.length).toBeGreaterThan(originalBytes.length);
    const verifyDoc = await PDFDocument.load(annotatedBytes);
    expect(verifyDoc.getPageCount()).toBe(1);
  });
});
