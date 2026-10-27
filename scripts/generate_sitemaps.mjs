import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://airpdf.pages.dev';
const TODAY = new Date().toISOString().split('T')[0];

const staticPages = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'about', priority: '0.7', changefreq: 'monthly' },
  { path: 'contact', priority: '0.6', changefreq: 'monthly' },
  { path: 'privacy', priority: '0.5', changefreq: 'monthly' },
  { path: 'terms', priority: '0.5', changefreq: 'monthly' },
];

const toolsDir = path.resolve('src/content/tools');
const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.md'));

const popularSlugs = new Set([
  'merge-pdf', 'compress-pdf', 'split-pdf', 'edit-pdf',
  'ocr-pdf', 'sign-pkcs-pdf', 'protect-pdf', 'unlock-pdf',
  'pdf-to-word', 'pdf-to-jpg', 'jpg-to-pdf', 'redact-pdf'
]);

const toolPages = toolFiles.map(file => {
  const slug = file.replace(/\.md$/, '');
  const isPopular = popularSlugs.has(slug);
  return {
    path: `tools/${slug}`,
    priority: isPopular ? '0.9' : '0.8',
    changefreq: isPopular ? 'daily' : 'weekly'
  };
});

const allPages = [...staticPages, ...toolPages];

// 1. Generate Direct <urlset> sitemap.xml
let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xmlContent += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

for (const page of allPages) {
  const url = page.path ? `${DOMAIN}/${page.path}/` : `${DOMAIN}/`;
  xmlContent += `  <url>\n`;
  xmlContent += `    <loc>${url}</loc>\n`;
  xmlContent += `    <lastmod>${TODAY}</lastmod>\n`;
  xmlContent += `    <changefreq>${page.changefreq}</changefreq>\n`;
  xmlContent += `    <priority>${page.priority}</priority>\n`;
  xmlContent += `  </url>\n`;
}

xmlContent += `</urlset>\n`;

// 2. Generate <sitemapindex> pointing to sitemap.xml
let indexContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
indexContent += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
indexContent += `  <sitemap>\n`;
indexContent += `    <loc>${DOMAIN}/sitemap.xml</loc>\n`;
indexContent += `    <lastmod>${TODAY}</lastmod>\n`;
indexContent += `  </sitemap>\n`;
indexContent += `</sitemapindex>\n`;

// Write to public/
fs.writeFileSync('public/sitemap.xml', xmlContent, 'utf8');
fs.writeFileSync('public/sitemap-0.xml', xmlContent, 'utf8');
fs.writeFileSync('public/sitemap-index.xml', indexContent, 'utf8');
fs.writeFileSync('public/sitemap_index.xml', indexContent, 'utf8');

console.log(`✓ Generated sitemaps with ${allPages.length} URLs (Domain: ${DOMAIN}, Date: ${TODAY})`);

// If dist/ exists, also write directly to dist/
if (fs.existsSync('dist')) {
  fs.writeFileSync('dist/sitemap.xml', xmlContent, 'utf8');
  fs.writeFileSync('dist/sitemap-0.xml', xmlContent, 'utf8');
  fs.writeFileSync('dist/sitemap-index.xml', indexContent, 'utf8');
  fs.writeFileSync('dist/sitemap_index.xml', indexContent, 'utf8');
  console.log(`✓ Synchronized sitemaps to dist/ folder`);
}
