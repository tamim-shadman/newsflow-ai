// Better fix script for Bangladesh scraping section
// Run: node fix-bangladesh-scraping-v2.cjs

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'scrape-site.js');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to match the entire Bangladesh if block including nested code
const pattern = /\/\/ For Bangladesh category:.*?\n\s+if \(category === "bangladesh"\) \{[\s\S]*?\n\s+\} else \{/;

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
    } else {`;

// Test if pattern matches
if (!pattern.test(content)) {
  console.error('❌ Could not find Bangladesh section pattern');
  console.log('Looking for: // For Bangladesh category:');
  process.exit(1);
}

// Backup original
const backupPath = filePath + '.backup-v2';
fs.writeFileSync(backupPath, content);
console.log(`✅ Backup created: ${backupPath}`);

// Replace
const newContent = content.replace(pattern, newBangladeshSection);

// Write new content
fs.writeFileSync(filePath, newContent);
console.log(`✅ Fixed Bangladesh scraping section in ${filePath}`);
console.log('✅ All done! Bangladesh section now uses Cheerio-only scraping.');
