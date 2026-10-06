import fs from 'fs';
import path from 'path';

const dist = path.resolve('dist');
const broken = [];
let totalLinks = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.matchAll(/href=["']([^"']+)["']/g);
      for (const m of matches) {
        const href = m[1];
        if (
          href.startsWith('http') ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('javascript:')
        ) {
          continue;
        }
        totalLinks++;
        let clean = href.split('?')[0].split('#')[0];
        if (clean.startsWith('/')) clean = clean.slice(1);
        const target = path.join(dist, clean);
        const exists =
          fs.existsSync(target) ||
          fs.existsSync(path.join(target, 'index.html')) ||
          fs.existsSync(target + '.html');
        if (!exists) {
          broken.push({ from: path.relative(dist, full), href });
        }
      }
    }
  }
}

walk(dist);
console.log(`Total internal links verified: ${totalLinks}`);
console.log(`Broken links detected: ${broken.length}`);
if (broken.length > 0) {
  console.log('Broken samples:', JSON.stringify(broken, null, 2));
  process.exit(1);
} else {
  console.log('✅ 100% of internal links successfully resolve to built static files!');
}
