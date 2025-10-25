import { FallbackChain } from "./api/utils/fallbackChain.js";

async function test() {
  console.log("🧪 Testing FallbackChain...\n");

  const categories = ["technology", "sports", "business", "health", "entertainment", "world", "general"];

  for (const category of categories) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📰 Testing category: ${category.toUpperCase()}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const chain = new FallbackChain({
        category,
        pageSize: 10,
        language: "en",
      });

      const articles = await chain.execute();
      console.log(`\n✅ SUCCESS for ${category}: Got ${articles.length} articles`);
      
      if (articles.length > 0) {
        console.log("\nSample article:");
        console.log(`  - Source: ${articles[0].source.name}`);
        console.log(`  - Title: ${articles[0].title.substring(0, 80)}...`);
        console.log(`  - URL: ${articles[0].url}`);
      }
    } catch (error) {
      console.error(`\n❌ FAILED for ${category}:`, error.message);
      if (error.details && error.details.length > 0) {
        console.log("\n📝 Error details:");
        error.details.slice(0, 5).forEach((err, idx) => {
          console.log(`  ${idx + 1}. ${err}`);
        });
        if (error.details.length > 5) {
          console.log(`  ... and ${error.details.length - 5} more errors`);
        }
      }
    }
  }

  console.log("\n\n🏁 Test complete!");
}

test().catch(console.error);
