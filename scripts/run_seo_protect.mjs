import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('dist/tools/protect-pdf/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const results = [];

// 1. Title
const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
results.push({ check: 'Title exists', pass: !!titleMatch && titleMatch[1].length > 0, val: titleMatch ? titleMatch[1] : null });

// 2. Meta description
const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
results.push({ check: 'Meta description', pass: !!descMatch && descMatch[1].length > 0, val: descMatch ? descMatch[1] : null });

// 3. Single H1
const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
results.push({ check: 'Single H1 tag', pass: !!h1Matches && h1Matches.length === 1, val: h1Matches ? h1Matches.length : 0 });

// 4. Canonical link
const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
results.push({ check: 'Canonical URL', pass: !!canonicalMatch && canonicalMatch[1].includes('/tools/protect-pdf'), val: canonicalMatch ? canonicalMatch[1] : null });

// 5. WebApplication Schema
const hasWebAppSchema = html.includes('WebApplication') && html.includes('"operatingSystem":"Any"');
results.push({ check: 'WebApplication Schema', pass: hasWebAppSchema });

// 6. FAQPage Schema
const hasFaqSchema = html.includes('FAQPage') && html.includes('Question');
results.push({ check: 'FAQPage Schema', pass: hasFaqSchema });

// 7. Privacy notice present
const hasPrivacyNotice = html.includes('Files are processed in your browser and never uploaded');
results.push({ check: 'Privacy notice present', pass: hasPrivacyNotice });

console.log(JSON.stringify(results, null, 2));
const allPassed = results.every(r => r.pass);
console.log('ALL PASSED:', allPassed);
process.exit(allPassed ? 0 : 1);
