import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  substituteMacros,
  applyHeaderFooter,
} from '../../src/lib/pdf/headerFooter';

describe('PDF Header, Footer & Running Head Inserter Engine', () => {
  it('replaces dynamic template macros accurately', () => {
    const template = 'Page {{page}} of {{total}} — Confidential ({{date}})';
    const output = substituteMacros(template, {
      page: 3,
      total: 10,
      date: '2026-10-18',
      filename: 'Contract',
    });

    expect(output).toBe('Page 3 of 10 — Confidential (2026-10-18)');
  });

  it('stamps headers and footers on multi-page PDF document', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      doc.addPage([500, 700]);
    }
    const inputBytes = await doc.save();

    const result = await applyHeaderFooter(inputBytes, {
      slots: {
        headerLeft: 'Acme Corp Annual Report',
        headerRight: '{{date}}',
        footerCenter: 'Page {{page}} of {{total}}',
      },
      skipFirstPage: false,
    });

    expect(result.totalPages).toBe(3);
    expect(result.pagesStamped).toBe(3);
    expect(result.stampedBytes.length).toBeGreaterThan(0);

    const verifyDoc = await PDFDocument.load(result.stampedBytes);
    expect(verifyDoc.getPageCount()).toBe(3);
  });

  it('skips cover page when skipFirstPage is enabled', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 4; i++) {
      doc.addPage([500, 700]);
    }
    const inputBytes = await doc.save();

    const result = await applyHeaderFooter(inputBytes, {
      slots: {
        headerCenter: 'Technical Manual',
        footerCenter: 'Page {{page}}',
      },
      skipFirstPage: true,
    });

    expect(result.totalPages).toBe(4);
    expect(result.pagesStamped).toBe(3); // Pages 2, 3, 4 stamped
  });

  it('handles alternating odd/even running head placement', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 2; i++) {
      doc.addPage([500, 700]);
    }
    const inputBytes = await doc.save();

    const result = await applyHeaderFooter(inputBytes, {
      slots: {
        headerLeft: 'Document Title',
        headerRight: 'Chapter 1',
      },
      alternating: true,
      skipFirstPage: false,
    });

    expect(result.pagesStamped).toBe(2);
    expect(result.stampedBytes.length).toBeGreaterThan(0);
  });
});
