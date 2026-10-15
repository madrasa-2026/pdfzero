import 'regenerator-runtime/runtime.js';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFName,
  PDFString,
  type PDFFont,
  type RGB,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { loadBengaliFont, requiresUnicodeFont } from './fontkit';

export interface BaseAnnotation {
  id: string;
  pageIndex: number; // 0-based target page index
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
}

export interface WhiteoutAnnotation extends BaseAnnotation {
  type: 'whiteout';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  points: { x: number; y: number }[][];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  imageBytes: Uint8Array;
  format: 'png' | 'jpeg';
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface LinkAnnotation extends BaseAnnotation {
  type: 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

export interface FormFieldAnnotation extends BaseAnnotation {
  type: 'formField';
  fieldType: 'text' | 'checkbox';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultValue?: string | boolean;
}

export type Annotation =
  | TextAnnotation
  | WhiteoutAnnotation
  | ShapeAnnotation
  | SignatureAnnotation
  | ImageAnnotation
  | HighlightAnnotation
  | LinkAnnotation
  | FormFieldAnnotation;

export interface PageConfig {
  originalIndex: number;
  rotation: number; // in degrees: 0, 90, 180, 270
  isDeleted: boolean;
}

export interface DocumentEditState {
  pages?: PageConfig[];
  annotations: Annotation[];
  formValues?: Record<string, string | boolean>;
}

export type ProgressCallback = (progress: number, statusText: string) => void;

/**
 * Parses hex color strings (e.g. #000000, #ff0000) to pdf-lib RGB.
 */
export function hexToRgbColor(hex: string): RGB {
  const cleanHex = hex.replace('#', '').trim();
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }
  return rgb(r, g, b);
}

/**
 * Maps screen coordinates (top-down) to native PDF coordinates (bottom-left)
 * taking into account page dimensions and rotation angle.
 */
export function transformCoordinatesForPageRotation(
  x: number,
  y: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
  rotationAngle: number
): { x: number; y: number; width: number; height: number } {
  const normAngle = ((rotationAngle % 360) + 360) % 360;

  if (normAngle === 90) {
    return {
      x: y,
      y: x,
      width: height,
      height: width,
    };
  } else if (normAngle === 180) {
    return {
      x: pageWidth - x - width,
      y: y,
      width,
      height,
    };
  } else if (normAngle === 270) {
    return {
      x: pageWidth - y - height,
      y: pageHeight - x - width,
      width: height,
      height: width,
    };
  }

  // 0 degrees default
  return {
    x,
    y: pageHeight - y - height,
    width,
    height,
  };
}

/**
 * Maps an individual point (e.g. for signature strokes)
 * taking into account page rotation.
 */
export function transformPointForPageRotation(
  x: number,
  y: number,
  pageWidth: number,
  pageHeight: number,
  rotationAngle: number
): { x: number; y: number } {
  const normAngle = ((rotationAngle % 360) + 360) % 360;

  if (normAngle === 90) {
    return { x: y, y: x };
  } else if (normAngle === 180) {
    return { x: pageWidth - x, y };
  } else if (normAngle === 270) {
    return { x: pageWidth - y, y: pageHeight - x };
  }

  return { x, y: pageHeight - y };
}

/**
 * Applies all user annotations and page reconfigurations directly to the PDF file bytes
 * using native vector operators and fontkit TTF embedding. Zero rasterization.
 */
export async function applyPdfEdits(
  fileBytes: Uint8Array,
  state: DocumentEditState,
  onProgress?: ProgressCallback
): Promise<Uint8Array> {
  onProgress?.(10, 'Initializing PDF engine...');

  const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  srcDoc.registerFontkit(fontkit);

  let targetDoc: PDFDocument;

  // 1. Page Recombination and Rotations
  if (state.pages && state.pages.length > 0) {
    onProgress?.(25, 'Reordering and transforming pages...');
    targetDoc = await PDFDocument.create();
    targetDoc.registerFontkit(fontkit);

    const activePageConfigs = state.pages.filter((p) => !p.isDeleted);
    if (activePageConfigs.length === 0) {
      throw new Error('Cannot delete all pages from the document.');
    }

    const indicesToCopy = activePageConfigs.map((p) => p.originalIndex);
    const copiedPages = await targetDoc.copyPages(srcDoc, indicesToCopy);

    for (let i = 0; i < activePageConfigs.length; i++) {
      const pageConfig = activePageConfigs[i];
      const page = copiedPages[i];
      targetDoc.addPage(page);

      if (pageConfig.rotation) {
        const currentAngle = page.getRotation().angle;
        page.setRotation(degrees((currentAngle + pageConfig.rotation) % 360));
      }
    }
  } else {
    // Modify in-place if no page reconfiguration is specified
    targetDoc = srcDoc;
  }

  onProgress?.(50, 'Loading typography assets...');
  let unicodeFont: PDFFont | null = null;
  // Helvetica family
  let helveticaFont: PDFFont | null = null;
  let helveticaBoldFont: PDFFont | null = null;
  let helveticaItalicFont: PDFFont | null = null;
  let helveticaBoldItalicFont: PDFFont | null = null;
  // Times Roman family
  let timesFont: PDFFont | null = null;
  let timesBoldFont: PDFFont | null = null;
  let timesItalicFont: PDFFont | null = null;
  let timesBoldItalicFont: PDFFont | null = null;
  // Courier family
  let courierFont: PDFFont | null = null;
  let courierBoldFont: PDFFont | null = null;
  let courierItalicFont: PDFFont | null = null;
  let courierBoldItalicFont: PDFFont | null = null;

  // 2. Vector Stamping of Annotations
  const totalAnnotations = state.annotations.length;
  onProgress?.(65, `Applying ${totalAnnotations} vector annotations...`);

  for (let i = 0; i < totalAnnotations; i++) {
    const annot = state.annotations[i];
    if (annot.pageIndex < 0 || annot.pageIndex >= targetDoc.getPageCount()) {
      continue;
    }

    const page = targetDoc.getPage(annot.pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pageRotation = page.getRotation().angle;

    switch (annot.type) {
      case 'text': {
        const isUnicode = requiresUnicodeFont(annot.text);
        let font: PDFFont;
        if (isUnicode) {
          if (!unicodeFont) {
            unicodeFont = await loadBengaliFont(targetDoc);
          }
          font = unicodeFont;
        } else {
          const family = annot.fontFamily || 'Helvetica';
          if (family === 'TimesRoman') {
            if (annot.bold && annot.italic) {
              if (!timesBoldItalicFont) {
                timesBoldItalicFont = await targetDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
              }
              font = timesBoldItalicFont;
            } else if (annot.bold) {
              if (!timesBoldFont) {
                timesBoldFont = await targetDoc.embedFont(StandardFonts.TimesRomanBold);
              }
              font = timesBoldFont;
            } else if (annot.italic) {
              if (!timesItalicFont) {
                timesItalicFont = await targetDoc.embedFont(StandardFonts.TimesRomanItalic);
              }
              font = timesItalicFont;
            } else {
              if (!timesFont) {
                timesFont = await targetDoc.embedFont(StandardFonts.TimesRoman);
              }
              font = timesFont;
            }
          } else if (family === 'Courier') {
            if (annot.bold && annot.italic) {
              if (!courierBoldItalicFont) {
                courierBoldItalicFont = await targetDoc.embedFont(StandardFonts.CourierBoldOblique);
              }
              font = courierBoldItalicFont;
            } else if (annot.bold) {
              if (!courierBoldFont) {
                courierBoldFont = await targetDoc.embedFont(StandardFonts.CourierBold);
              }
              font = courierBoldFont;
            } else if (annot.italic) {
              if (!courierItalicFont) {
                courierItalicFont = await targetDoc.embedFont(StandardFonts.CourierOblique);
              }
              font = courierItalicFont;
            } else {
              if (!courierFont) {
                courierFont = await targetDoc.embedFont(StandardFonts.Courier);
              }
              font = courierFont;
            }
          } else {
            // Default: Helvetica
            if (annot.bold && annot.italic) {
              if (!helveticaBoldItalicFont) {
                helveticaBoldItalicFont = await targetDoc.embedFont(StandardFonts.HelveticaBoldOblique);
              }
              font = helveticaBoldItalicFont;
            } else if (annot.bold) {
              if (!helveticaBoldFont) {
                helveticaBoldFont = await targetDoc.embedFont(StandardFonts.HelveticaBold);
              }
              font = helveticaBoldFont;
            } else if (annot.italic) {
              if (!helveticaItalicFont) {
                helveticaItalicFont = await targetDoc.embedFont(StandardFonts.HelveticaOblique);
              }
              font = helveticaItalicFont;
            } else {
              if (!helveticaFont) {
                helveticaFont = await targetDoc.embedFont(StandardFonts.Helvetica);
              }
              font = helveticaFont;
            }
          }
        }

        const textColor = annot.color ? hexToRgbColor(annot.color) : rgb(0, 0, 0);
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.fontSize * (annot.text.length * 0.6),
          annot.fontSize,
          pageWidth,
          pageHeight,
          pageRotation
        );

        page.drawText(annot.text, {
          x: coords.x,
          y: coords.y + annot.fontSize * 0.15,
          size: annot.fontSize,
          lineHeight: annot.fontSize * 1.2,
          font,
          color: textColor,
          rotate: degrees(pageRotation),
        });
        break;
      }

      case 'whiteout': {
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.width,
          annot.height,
          pageWidth,
          pageHeight,
          pageRotation
        );
        const fillColor = annot.color ? hexToRgbColor(annot.color) : rgb(1, 1, 1);

        page.drawRectangle({
          x: coords.x,
          y: coords.y,
          width: coords.width,
          height: coords.height,
          color: fillColor,
          opacity: 1.0,
        });
        break;
      }

      case 'shape': {
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.width,
          annot.height,
          pageWidth,
          pageHeight,
          pageRotation
        );
        const strokeColor = hexToRgbColor(annot.strokeColor);
        const fillColor = annot.fillColor ? hexToRgbColor(annot.fillColor) : undefined;

        if (annot.shapeType === 'rect') {
          page.drawRectangle({
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
            borderColor: strokeColor,
            borderWidth: annot.strokeWidth,
            color: fillColor,
          });
        } else if (annot.shapeType === 'circle') {
          page.drawEllipse({
            x: coords.x + coords.width / 2,
            y: coords.y + coords.height / 2,
            xScale: coords.width / 2,
            yScale: coords.height / 2,
            borderColor: strokeColor,
            borderWidth: annot.strokeWidth,
            color: fillColor,
          });
        } else if (annot.shapeType === 'line' || annot.shapeType === 'arrow') {
          const p1 = transformPointForPageRotation(annot.x, annot.y, pageWidth, pageHeight, pageRotation);
          const p2 = transformPointForPageRotation(annot.x + annot.width, annot.y + annot.height, pageWidth, pageHeight, pageRotation);
          const thickness = annot.strokeWidth || 2;

          page.drawLine({
            start: p1,
            end: p2,
            thickness,
            color: strokeColor,
          });

          if (annot.shapeType === 'arrow') {
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const headLength = Math.max(10, thickness * 4);
            const arrowP1 = {
              x: p2.x - headLength * Math.cos(angle - Math.PI / 6),
              y: p2.y - headLength * Math.sin(angle - Math.PI / 6),
            };
            const arrowP2 = {
              x: p2.x - headLength * Math.cos(angle + Math.PI / 6),
              y: p2.y - headLength * Math.sin(angle + Math.PI / 6),
            };
            page.drawLine({
              start: p2,
              end: arrowP1,
              thickness,
              color: strokeColor,
            });
            page.drawLine({
              start: p2,
              end: arrowP2,
              thickness,
              color: strokeColor,
            });
          }
        }
        break;
      }

      case 'signature': {
        const strokeColor = annot.strokeColor ? hexToRgbColor(annot.strokeColor) : rgb(0, 0, 0);
        const thickness = annot.strokeWidth ?? 2;

        for (const stroke of annot.points) {
          for (let j = 0; j < stroke.length - 1; j++) {
            const p1 = transformPointForPageRotation(stroke[j].x, stroke[j].y, pageWidth, pageHeight, pageRotation);
            const p2 = transformPointForPageRotation(stroke[j + 1].x, stroke[j + 1].y, pageWidth, pageHeight, pageRotation);

            page.drawLine({
              start: p1,
              end: p2,
              thickness,
              color: strokeColor,
            });
          }
        }
        break;
      }

      case 'image': {
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.width,
          annot.height,
          pageWidth,
          pageHeight,
          pageRotation
        );
        let embeddedImage;
        if (annot.format === 'png') {
          embeddedImage = await targetDoc.embedPng(annot.imageBytes);
        } else {
          embeddedImage = await targetDoc.embedJpg(annot.imageBytes);
        }

        page.drawImage(embeddedImage, {
          x: coords.x,
          y: coords.y,
          width: coords.width,
          height: coords.height,
        });
        break;
      }

      case 'highlight': {
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.width,
          annot.height,
          pageWidth,
          pageHeight,
          pageRotation
        );
        const color = hexToRgbColor(annot.color || '#facc15');

        page.drawRectangle({
          x: coords.x,
          y: coords.y,
          width: coords.width,
          height: coords.height,
          color,
          opacity: 0.35,
        });
        break;
      }

      case 'link': {
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.width,
          annot.height,
          pageWidth,
          pageHeight,
          pageRotation
        );
        const linkAnnot = targetDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [coords.x, coords.y, coords.x + coords.width, coords.y + coords.height],
          Border: [0, 0, 0],
          A: {
            Type: 'Action',
            S: 'URI',
            URI: PDFString.of(annot.url),
          },
        });

        const linkAnnotRef = targetDoc.context.register(linkAnnot);
        let annots = page.node.Annots();
        if (!annots) {
          annots = targetDoc.context.obj([]);
          page.node.set(PDFName.of('Annots'), annots);
        }
        annots.push(linkAnnotRef);
        break;
      }

      case 'formField': {
        const coords = transformCoordinatesForPageRotation(
          annot.x,
          annot.y,
          annot.width,
          annot.height,
          pageWidth,
          pageHeight,
          pageRotation
        );
        const form = targetDoc.getForm();

        if (annot.fieldType === 'text') {
          const tf = form.createTextField(annot.name);
          tf.addToPage(page, {
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
          });
          if (annot.defaultValue) {
            tf.setText(String(annot.defaultValue));
          }
        } else if (annot.fieldType === 'checkbox') {
          const cb = form.createCheckBox(annot.name);
          cb.addToPage(page, {
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
          });
          if (annot.defaultValue === true) {
            cb.check();
          }
        }
        break;
      }
    }
  }

  // 3. Form Field Filling (Existing AcroForms)
  if (state.formValues && Object.keys(state.formValues).length > 0) {
    onProgress?.(80, 'Updating form fields...');
    try {
      const form = targetDoc.getForm();
      for (const [fieldName, val] of Object.entries(state.formValues)) {
        try {
          if (typeof val === 'boolean') {
            const checkField = form.getCheckBox(fieldName);
            if (val) checkField.check();
            else checkField.uncheck();
          } else {
            const textField = form.getTextField(fieldName);
            textField.setText(String(val));
          }
        } catch {
          // Ignore field type mismatches
        }
      }
    } catch {
      // Document may have no form
    }
  }

  onProgress?.(90, 'Packaging final document...');
  const resultBytes = await targetDoc.save();
  onProgress?.(100, 'Edits applied successfully');

  return resultBytes;
}
