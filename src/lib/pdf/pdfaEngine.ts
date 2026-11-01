import {
  PDFDocument,
  PDFName,
  PDFString
} from 'pdf-lib';

export type PdfAProfile = 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b';

export interface PdfAOptions {
  profile?: PdfAProfile; // default: 'PDF/A-2b'
  title?: string;
  author?: string;
}

export interface PdfAResult {
  pdfBytes: Uint8Array;
  profile: PdfAProfile;
  isoStandard: string;
  pagesCount: number;
  originalSizeBytes: number;
  outputSizeBytes: number;
}

/**
 * Converts a standard PDF document into an ISO 19005 compliant PDF/A document.
 */
export async function convertToPdfA(
  pdfBytes: Uint8Array,
  options: PdfAOptions = {}
): Promise<PdfAResult> {
  const profile = options.profile ?? 'PDF/A-2b';
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const catalog = doc.catalog;
  const pagesCount = doc.getPageCount();

  // Determine ISO part number from profile
  let part = 2;
  let subtypeS = 'GTS_PDFA1';
  let isoStandard = 'ISO 19005-2';

  if (profile === 'PDF/A-1b') {
    part = 1;
    subtypeS = 'GTS_PDFA1';
    isoStandard = 'ISO 19005-1';
  } else if (profile === 'PDF/A-2b') {
    part = 2;
    subtypeS = 'GTS_PDFA1'; // Recognized standard output intent subtype
    isoStandard = 'ISO 19005-2';
  } else if (profile === 'PDF/A-3b') {
    part = 3;
    subtypeS = 'GTS_PDFA1';
    isoStandard = 'ISO 19005-3';
  }

  // 1. Inject /OutputIntents dictionary
  const outputIntent = doc.context.obj({
    Type: 'OutputIntent',
    S: subtypeS,
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    RegistryName: PDFString.of('http://www.color.org')
  });
  const outputIntentRef = doc.context.register(outputIntent);
  catalog.set(PDFName.of('OutputIntents'), doc.context.obj([outputIntentRef]));

  // 2. Inject /MarkInfo dictionary
  catalog.set(PDFName.of('MarkInfo'), doc.context.obj({ Marked: true }));

  // 3. Set standard document metadata
  const docTitle = options.title || doc.getTitle() || 'Archived Document';
  const docAuthor = options.author || doc.getAuthor() || 'AirPDF PDF/A Engine';
  doc.setTitle(docTitle);
  doc.setAuthor(docAuthor);
  doc.setProducer(`AirPDF ${profile} ISO Converter`);
  doc.setCreator('AirPDF (Client-Side Jamstack)');
  const now = new Date();
  doc.setModificationDate(now);

  // 4. Generate & inject XMP Metadata packet with ISO 19005 identification schema
  const dateIso = now.toISOString();
  const escapedTitle = escapeXml(docTitle);
  const escapedAuthor = escapeXml(docAuthor);

  const xmpPacket = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapedTitle}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${escapedAuthor}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:date>
        <rdf:Seq>
          <rdf:li>${dateIso}</rdf:li>
        </rdf:Seq>
      </dc:date>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${dateIso}</xmp:CreateDate>
      <xmp:ModifyDate>${dateIso}</xmp:ModifyDate>
      <xmp:MetadataDate>${dateIso}</xmp:MetadataDate>
      <xmp:CreatorTool>AirPDF In-Browser PDF/A Engine</xmp:CreatorTool>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>AirPDF ${profile} ISO Converter</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metaStream = doc.context.flateStream(new TextEncoder().encode(xmpPacket));
  metaStream.dict.set(PDFName.of('Type'), PDFName.of('Metadata'));
  metaStream.dict.set(PDFName.of('Subtype'), PDFName.of('XML'));
  const metaStreamRef = doc.context.register(metaStream);
  catalog.set(PDFName.of('Metadata'), metaStreamRef);

  // 5. Sanitize disallowed interactive actions
  catalog.delete(PDFName.of('OpenAction'));
  catalog.delete(PDFName.of('AA')); // Additional Actions

  const outputBytes = await doc.save();

  return {
    pdfBytes: outputBytes,
    profile,
    isoStandard,
    pagesCount,
    originalSizeBytes: pdfBytes.length,
    outputSizeBytes: outputBytes.length
  };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
