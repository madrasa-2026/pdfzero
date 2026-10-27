import fs from 'fs';

// 1. Fix src/pages/tools/[slug].astro
let slugContent = fs.readFileSync('src/pages/tools/[slug].astro', 'utf8');
slugContent = slugContent.replace(
  /'url': `https:\/\/airpdf\.pages\.dev\/tools\/\${tool\.slug}`/g,
  "'url': `https://airpdf.pages.dev/tools/${tool.slug}/`"
);
slugContent = slugContent.replace(
  /'item': `https:\/\/airpdf\.pages\.dev\/tools\/\${tool\.slug}`/g,
  "'item': `https://airpdf.pages.dev/tools/${tool.slug}/`"
);
slugContent = slugContent.replace(
  /'item': 'https:\/\/airpdf\.pages\.dev'/g,
  "'item': 'https://airpdf.pages.dev/'"
);
slugContent = slugContent.replace(
  /`https:\/\/airpdf\.pages\.dev\/tools\/\${tool\.slug}#step-/g,
  "`https://airpdf.pages.dev/tools/${tool.slug}/#step-"
);
slugContent = slugContent.replace(
  /canonicalUrl={`https:\/\/airpdf\.pages\.dev\/tools\/\${tool\.slug}`}/g,
  "canonicalUrl={`https://airpdf.pages.dev/tools/${tool.slug}/`}"
);
slugContent = slugContent.replace(
  /<link rel="alternate" hreflang="en" href={`https:\/\/airpdf\.pages\.dev\/tools\/\${tool\.slug}`} \/>/g,
  '<link rel="alternate" hreflang="en" href={`https://airpdf.pages.dev/tools/${tool.slug}/`} />'
);
fs.writeFileSync('src/pages/tools/[slug].astro', slugContent, 'utf8');
console.log('✓ Fixed src/pages/tools/[slug].astro');

// 2. Fix src/pages/index.astro
let indexContent = fs.readFileSync('src/pages/index.astro', 'utf8');
indexContent = indexContent.replace(
  /'url': `https:\/\/airpdf\.pages\.dev\/tools\/\${tool\.slug}`/g,
  "'url': `https://airpdf.pages.dev/tools/${tool.slug}/`"
);
indexContent = indexContent.replace(
  /href="\/tools\/merge-pdf"/g,
  'href="/tools/merge-pdf/"'
);
indexContent = indexContent.replace(
  /href="\/tools\/compress-pdf"/g,
  'href="/tools/compress-pdf/"'
);
indexContent = indexContent.replace(
  /href={`\/tools\/\${tool\.slug}`}/g,
  'href={`/tools/${tool.slug}/`}'
);
fs.writeFileSync('src/pages/index.astro', indexContent, 'utf8');
console.log('✓ Fixed src/pages/index.astro');

// 3. Fix src/components/layout/Footer.astro
let footerContent = fs.readFileSync('src/components/layout/Footer.astro', 'utf8');
footerContent = footerContent.replace(/href="\/tools\/([^"/]+)"/g, 'href="/tools/$1/"');
footerContent = footerContent.replace(/href="\/about"/g, 'href="/about/"');
footerContent = footerContent.replace(/href="\/contact"/g, 'href="/contact/"');
footerContent = footerContent.replace(/href="\/privacy"/g, 'href="/privacy/"');
footerContent = footerContent.replace(/href="\/terms"/g, 'href="/terms/"');
fs.writeFileSync('src/components/layout/Footer.astro', footerContent, 'utf8');
console.log('✓ Fixed src/components/layout/Footer.astro');

// 4. Fix src/components/layout/Header.astro
let headerContent = fs.readFileSync('src/components/layout/Header.astro', 'utf8');
headerContent = headerContent.replace(/href="\/tools\/([^"/]+)"/g, 'href="/tools/$1/"');
headerContent = headerContent.replace(/href="\/about"/g, 'href="/about/"');
headerContent = headerContent.replace(/href="\/contact"/g, 'href="/contact/"');
fs.writeFileSync('src/components/layout/Header.astro', headerContent, 'utf8');
console.log('✓ Fixed src/components/layout/Header.astro');
