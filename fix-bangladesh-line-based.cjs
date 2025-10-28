// Line-based fix for Bangladesh section
// Run: node fix-bangladesh-line-based.cjs

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'scrape-site.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startLine = 696; // 0-indexed (line 697)
const endLine = 751; // 0-indexed, exclusive (up to but not including line 752)

// New Bangladesh section (as array of lines)
const newLines = [
  '    // For Bangladesh category: Use Cheerio-based scraper (no Puppeteer dependencies)',
  '    if (category === "bangladesh") {',
  '      console.log(`[scrape-site] 🇧🇩 Bangladesh category - using Cheerio-based scraper`);',
  '      ',
  '      try {',
  '        const result = await bangladeshScrape(targetUrl);',
  '        ',
  '        if (result.success) {',
  '          html = result.content || "";',
  '          fetchMethod = result.method || "cheerio";',
  '          console.log(`[scrape-site] ✅ Bangladesh scraper successful (${html.length} chars, method: ${fetchMethod})`);',
  '        } else {',
  '          console.error(`[scrape-site] ❌ Bangladesh scraper failed:`, result.error);',
  '          throw new Error(result.error || "Bangladesh scraper failed");',
  '        }',
  '      } catch (bangladeshError) {',
  '        console.error(`[scrape-site] ❌ Bangladesh scraping failed:`, bangladeshError.message);',
  '        throw new Error(`Bangladesh scraping failed: ${bangladeshError.message}`);',
  '      }',
  '    } else {'
];

// Backup
const backupPath = filePath + '.backup-line-based';
fs.writeFileSync(backupPath, lines.join('\n'));
console.log(`✅ Backup created: ${backupPath}`);

// Replace lines
const newContent = [
  ...lines.slice(0, startLine),
  ...newLines,
  ...lines.slice(endLine)
].join('\n');

fs.writeFileSync(filePath, newContent);
console.log(`✅ Replaced lines ${startLine + 1}-${endLine + 1} with Cheerio-based Bangladesh scraper`);
console.log('✅ All done!');
