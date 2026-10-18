import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  calculateDeskewBounds,
  detectSkewAngle,
  applyDeskewToPdf,
} from '../../src/lib/pdf/deskew';

describe('PDF Deskew & Straightener Engine', () => {
  it('calculates center rotation offset without drifting coordinates when angle is 0', () => {
    const bounds = calculateDeskewBounds(595, 842, 0);
    expect(bounds.width).toBe(595);
    expect(bounds.height).toBe(842);
    expect(bounds.drawX).toBe(0);
    expect(bounds.drawY).toBe(0);
  });

  it('calculates expanded bounding box correctly for arbitrary rotation', () => {
    const bounds = calculateDeskewBounds(200, 300, 10, true);
    expect(bounds.width).toBeGreaterThan(200);
    expect(bounds.height).toBeGreaterThan(300);
    expect(bounds.drawX).toBeGreaterThan(0);
  });

  it('detects correction angle from simulated tilted line point cloud', () => {
    // Generate simulated text lines tilted by +3.0 degrees
    const rad = (3.0 * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const points: [number, number][] = [];

    for (let line = 50; line <= 250; line += 40) {
      for (let x = 20; x <= 200; x += 2) {
        const y = line;
        const rotX = x * cos - y * sin;
        const rotY = x * sin + y * cos;
        points.push([rotX, rotY]);
      }
    }

    const detected = detectSkewAngle(points);
    // Correction angle should be around -3.0 deg (within 0.5 deg tolerance)
    expect(detected).toBeLessThanOrEqual(-2.5);
    expect(detected).toBeGreaterThanOrEqual(-3.5);
  });

  it('straightens multi-page PDF documents and produces valid output', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = doc.addPage([500, 700]);
      page.drawText(`Page ${i + 1}`);
    }
    const inputBytes = await doc.save();

    const result = await applyDeskewToPdf(inputBytes, {
      globalAngleDegrees: -2.5,
      expandCanvas: false,
    });

    expect(result.pageCount).toBe(3);
    expect(result.anglesApplied[1]).toBe(-2.5);
    expect(result.outputSize).toBeGreaterThan(0);

    const verifyDoc = await PDFDocument.load(result.outputBytes);
    expect(verifyDoc.getPageCount()).toBe(3);
    const p1 = verifyDoc.getPage(0);
    expect(p1.getWidth()).toBe(500);
    expect(p1.getHeight()).toBe(700);
  });
});
