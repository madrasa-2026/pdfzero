import fs from 'fs';
import path from 'path';

const toolsDir = path.resolve('src/content/tools');
const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.md'));

console.log('Auditing content depth for AdSense readiness:');
let allPassed = true;

for (const file of files) {
  const raw = fs.readFileSync(path.join(toolsDir, file), 'utf8');
  // Frontmatter is between --- and ---
  const parts = raw.split('---');
  const body = parts.slice(2).join('---').trim();
  const frontmatter = parts[1] || '';

  const editorialWords = body ? body.split(/\s+/).filter(Boolean).length : 0;
  
  // Count FAQs (starts with question:)
  const faqCount = (frontmatter.match(/question:/g) || []).length;
  // Count how-to steps (title: under howToSteps)
  const stepCount = (frontmatter.match(/title:/g) || []).length - 1; // subtract 1 for root title
  
  const metaDescMatch = frontmatter.match(/metaDescription:\s*["']?([^"'\n\r]+)["']?/);
  const descLength = metaDescMatch ? metaDescMatch[1].length : 0;

  const passed = editorialWords >= 150 && faqCount >= 4;
  if (!passed) allPassed = false;

  console.log(`- ${file.replace('.md', '')}: ${editorialWords} words, ${faqCount} FAQs, desc ${descLength} chars -> ${passed ? 'PASS' : 'FAIL'}`);
}

console.log(`\nOverall Content Depth Status: ${allPassed ? 'ALL PASS ✅' : 'FAIL ❌'}`);
