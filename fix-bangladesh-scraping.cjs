// Manual fix script for Bangladesh scraping section
// Run: node fix-bangladesh-scraping.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'scrape-site.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the Bangladesh section
// This pattern matches from the Bangladesh comment to the end of that if block
const bangladeshSectionStart = content.indexOf('// For Bangladesh category: Use aggressive Jina Reader strategy');
const bangladeshSectionEnd = content.indexOf('} else {', bangladeshSectionStart);

if (bangladeshSectionStart === -1 || bangladeshSectionEnd === -1) {
  console.error('❌ Could not find Bangladesh section to replace');
  process.exit(1);
}

// Extract the section to replace
const before = content.substring(0, bangladeshSectionStart);
const after = content.substring(bangladeshSectionEnd);

// New Bangladesh section
const newBangladeshSection = `// For Bangladesh category: Use Cheerio-based scraper (no Puppeteer dependencies)
    if (category === "bangladesh") {
      console.log(\`[scrape-site] 🇧🇩 Bangladesh category - using Cheerio-based scraper\`);
      
      try {
        const result = await bangladeshScrape(targetUrl);
        
        if (result.success) {
          html = result.content || "";
          fetchMethod = result.method || "cheerio";
          console.log(\`[scrape-site] ✅ Bangladesh scraper successful (\${html.length} chars, method: \${fetchMethod})\`);
        } else {
          console.error(\`[scrape-site] ❌ Bangladesh scraper failed:\`, result.error);
          throw new Error(result.error || "Bangladesh scraper failed");
        }
      } catch (bangladeshError) {
        console.error(\`[scrape-site] ❌ Bangladesh scraping failed:\`, bangladeshError.message);
        throw new Error(\`Bangladesh scraping failed: \${bangladeshError.message}\`);
      }
    `;

// Combine
const newContent = before + newBangladeshSection + after;

// Backup original
const backupPath = filePath + '.before-fix';
fs.writeFileSync(backupPath, content);
console.log(`✅ Backup created: ${backupPath}`);

// Write new content
fs.writeFileSync(filePath, newContent);
console.log(`✅ Fixed Bangladesh scraping section in ${filePath}`);
console.log('✅ All done! You can now test the scraping.');
