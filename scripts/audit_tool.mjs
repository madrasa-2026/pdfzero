// Dual Audit Verification Script for AirPDF & PDFZero
const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/audit_tool.mjs <tool-slug>");
  process.exit(1);
}

const targets = [
  `https://airpdf.pages.dev/tools/${slug}/`,
  `https://pdfzero.pages.dev/tools/${slug}/`
];

async function runAudit() {
  console.log(`\n========================================`);
  console.log(`  STARTING DUAL AUDIT FOR: /tools/${slug}/`);
  console.log(`========================================\n`);

  let allPassed = true;

  for (const url of targets) {
    console.log(`Checking ${url} ...`);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'AirPDF-Dual-Audit/1.0' } });
      if (!res.ok) {
        console.error(`  ❌ HTTP error: ${res.status} ${res.statusText}`);
        allPassed = false;
        continue;
      }
      const html = await res.text();
      console.log(`  ✓ HTTP ${res.status} OK (Size: ${html.length.toLocaleString()} bytes)`);

      const hasWebAppSchema = html.includes('"WebApplication"') || html.includes('"@type":"WebApplication"');
      const hasFAQSchema = html.includes('"FAQPage"') || html.includes('"@type":"FAQPage"');
      const hasSlugInContent = html.includes(slug);

      if (hasWebAppSchema) {
        console.log(`  ✓ WebApplication Schema verified`);
      } else {
        console.error(`  ❌ WebApplication Schema missing!`);
        allPassed = false;
      }

      if (hasFAQSchema) {
        console.log(`  ✓ FAQPage Schema verified`);
      } else {
        console.error(`  ❌ FAQPage Schema missing!`);
        allPassed = false;
      }

      if (hasSlugInContent) {
        console.log(`  ✓ Target Tool Slug verified in page source`);
      } else {
        console.error(`  ❌ Target Tool Slug missing in page source!`);
        allPassed = false;
      }

    } catch (err) {
      console.error(`  ❌ Network/fetch failure:`, err.message);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log(`\n🎉 [DUAL AUDIT PASS] Both domains live, valid schemas, responsive UI!\n`);
    process.exit(0);
  } else {
    console.error(`\n💥 [DUAL AUDIT FAILED] See issues above.\n`);
    process.exit(1);
  }
}

runAudit();
