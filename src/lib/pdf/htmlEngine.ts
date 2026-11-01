import { PDFDocument } from 'pdf-lib';

export type PaperSize = 'a4' | 'letter' | 'legal';
export type Orientation = 'portrait' | 'landscape';
export type MarginOption = 'none' | 'compact' | 'normal' | 'wide';

export interface HtmlToPdfOptions {
  paperSize?: PaperSize;
  orientation?: Orientation;
  margin?: MarginOption;
  printBackground?: boolean;
  title?: string;
}

const MARGIN_MAP: Record<MarginOption, string> = {
  none: '0mm',
  compact: '10mm',
  normal: '20mm',
  wide: '30mm'
};

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 }
};

/**
 * Generates an isolated, self-contained HTML document with embedded print stylesheets
 * and @page formatting rules tailored for browser vector rendering or printing.
 */
export function generatePrintHtml(
  rawHtml: string,
  rawCss: string = '',
  options: HtmlToPdfOptions = {}
): string {
  const paper = options.paperSize || 'a4';
  const orientation = options.orientation || 'portrait';
  const margin = options.margin || 'normal';
  const printBg = options.printBackground !== false;
  const title = options.title || 'Exported Document';

  const marginValue = MARGIN_MAP[margin];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(title)}</title>
  <style>
    /* Reset & Base Styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1e293b;
      background-color: #ffffff;
      -webkit-print-color-adjust: ${printBg ? 'exact' : 'auto'};
      print-color-adjust: ${printBg ? 'exact' : 'auto'};
    }

    /* Print Specific Formatting */
    @page {
      size: ${paper} ${orientation};
      margin: ${marginValue};
    }

    @media print {
      body {
        width: 100%;
        margin: 0;
        padding: 0;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Custom User Styles */
    ${rawCss}
  </style>
</head>
<body>
  ${rawHtml}
</body>
</html>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a standardized PDF from an array of rendered image bytes (PNG or JPEG).
 */
export async function buildPdfFromCanvases(
  pages: { imageBytes: Uint8Array; isPng?: boolean }[],
  paperSize: PaperSize = 'a4',
  orientation: Orientation = 'portrait'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const dims = PAPER_DIMENSIONS[paperSize];
  const targetW = orientation === 'landscape' ? dims.height : dims.width;
  const targetH = orientation === 'landscape' ? dims.width : dims.height;

  for (const page of pages) {
    const embedded = page.isPng
      ? await pdfDoc.embedPng(page.imageBytes)
      : await pdfDoc.embedJpg(page.imageBytes);

    const pdfPage = pdfDoc.addPage([targetW, targetH]);

    // Fit image to page dimensions while preserving aspect ratio
    const imgRatio = embedded.width / embedded.height;
    const pageRatio = targetW / targetH;

    let renderW = targetW;
    let renderH = targetH;
    let posX = 0;
    let posY = 0;

    if (imgRatio > pageRatio) {
      renderW = targetW;
      renderH = targetW / imgRatio;
      posY = (targetH - renderH) / 2;
    } else {
      renderH = targetH;
      renderW = targetH * imgRatio;
      posX = (targetW - renderW) / 2;
    }

    pdfPage.drawImage(embedded, {
      x: posX,
      y: posY,
      width: renderW,
      height: renderH
    });
  }

  return await pdfDoc.save();
}

/**
 * Built-in ready-to-use HTML & CSS templates for instant document drafting.
 */
export const HTML_TEMPLATES = {
  invoice: {
    name: 'Commercial Invoice',
    html: `<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #0f172a; padding-bottom: 20px;">
    <div>
      <h1 style="font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">INVOICE</h1>
      <p style="color: #64748b; font-size: 13px;">#INV-2026-0042</p>
    </div>
    <div style="text-align: right;">
      <h3 style="font-size: 16px; font-weight: 700; color: #0f172a;">Acme Global Labs Inc.</h3>
      <p style="color: #64748b; font-size: 12px;">100 Silicon Way, Tech Park</p>
      <p style="color: #64748b; font-size: 12px;">billing@acmeglobal.io</p>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div>
      <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px;">Billed To:</p>
      <p style="font-weight: 700; color: #0f172a;">Nova Enterprises LLC</p>
      <p style="color: #475569; font-size: 13px;">Attn: Sarah Jenkins</p>
      <p style="color: #475569; font-size: 13px;">452 Innovation Blvd, Ste 400</p>
    </div>
    <div style="text-align: right;">
      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><strong>Issue Date:</strong> Nov 01, 2026</p>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><strong>Payment Due:</strong> Nov 15, 2026</p>
      <p style="font-size: 12px; color: #059669; font-weight: 700;">Status: Due Upon Receipt</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <thead>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 12px; color: #475569;">
        <th style="padding: 12px 10px;">DESCRIPTION</th>
        <th style="padding: 12px 10px; text-align: center;">QTY</th>
        <th style="padding: 12px 10px; text-align: right;">UNIT PRICE</th>
        <th style="padding: 12px 10px; text-align: right;">AMOUNT</th>
      </tr>
    </thead>
    <tbody style="font-size: 13px; color: #1e293b;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px;"><strong>Cloudflare Edge Architecture Consulting</strong><br><span style="font-size: 11px; color: #64748b;">Workers & KV migration</span></td>
        <td style="padding: 12px 10px; text-align: center;">24 hrs</td>
        <td style="padding: 12px 10px; text-align: right;">$150.00</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 600;">$3,600.00</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px;"><strong>Client-Side PDF Engine Implementation</strong><br><span style="font-size: 11px; color: #64748b;">Full privacy, zero server uploads</span></td>
        <td style="padding: 12px 10px; text-align: center;">1 pkg</td>
        <td style="padding: 12px 10px; text-align: right;">$1,850.00</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 600;">$1,850.00</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
    <div style="width: 250px;">
      <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #64748b; font-size: 13px;">
        <span>Subtotal:</span>
        <span style="color: #0f172a; font-weight: 600;">$5,450.00</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #64748b; font-size: 13px;">
        <span>Tax (0%):</span>
        <span style="color: #0f172a; font-weight: 600;">$0.00</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 800; color: #0f172a;">
        <span>Total Due:</span>
        <span>$5,450.00</span>
      </div>
    </div>
  </div>

  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #475569;">
    <strong>Payment Instructions:</strong> Wire transfer to routing #021000021, Account #88392019482. Thank you for your business!
  </div>
</div>`,
    css: `body { background: #ffffff; }`
  },
  resume: {
    name: 'Executive Resume',
    html: `<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #1e293b;">
  <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">ALEXANDER WRIGHT</h1>
    <p style="font-size: 13px; color: #059669; font-weight: 700; margin-bottom: 8px;">Principal Systems Architect & Full-Stack Lead</p>
    <p style="font-size: 12px; color: #64748b;">San Francisco, CA • alex.wright@domain.com • (555) 492-0192 • github.com/alexwright</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 10px; font-weight: 800;">Professional Summary</h2>
    <p style="font-size: 12.5px; line-height: 1.6; color: #334155;">Results-oriented Systems Architect with 12+ years of experience engineering high-throughput distributed applications, zero-latency WebAssembly micro-engines, and privacy-preserving client-side document processing pipelines.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 12px; font-weight: 800;">Experience</h2>
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h3 style="font-size: 13px; font-weight: 700; color: #0f172a;">Lead Cloud Architect — CloudEdge Technologies</h3>
        <span style="font-size: 11px; color: #64748b; font-weight: 600;">2022 – Present</span>
      </div>
      <p style="font-size: 11.5px; color: #059669; font-weight: 600; margin-bottom: 6px;">Austin, TX</p>
      <ul style="font-size: 12px; color: #334155; padding-left: 18px; line-height: 1.5;">
        <li>Spearheaded transition of 80M daily request API to Cloudflare Workers, trimming server costs by 73%.</li>
        <li>Architected browser-native WebAssembly pipelines for client-side processing, eliminating cloud storage egress fees.</li>
      </ul>
    </div>
  </div>
</div>`,
    css: `body { background: #ffffff; }`
  },
  report: {
    name: 'Technical Report',
    html: `<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #0f172a;">
  <div style="background-color: #0f172a; color: white; padding: 28px 24px; border-radius: 8px; margin-bottom: 24px;">
    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8;">Technical Whitepaper</span>
    <h1 style="font-size: 24px; font-weight: 800; margin-top: 6px; margin-bottom: 8px;">Client-Side Zero-Trust PDF Processing Architecture</h1>
    <p style="font-size: 13px; color: #94a3b8;">Author: Engineering Research Group • Date: November 2026</p>
  </div>

  <div style="font-size: 13px; line-height: 1.6; color: #334155;">
    <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 18px; margin-bottom: 8px;">1. Executive Summary</h2>
    <p style="margin-bottom: 12px;">Traditional document utility portals rely on remote cloud file uploads. This introduces severe compliance risks under GDPR, HIPAA, and corporate NDA protocols. This paper demonstrates the implementation of client-side WebAssembly rendering.</p>
    
    <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
      <p style="font-size: 12px; color: #0369a1; font-weight: 600;">Key Metric: 100% reduction in document data leakage risk by running all transformations in the browser sandbox.</p>
    </div>
  </div>
</div>`,
    css: `body { background: #ffffff; }`
  }
};
