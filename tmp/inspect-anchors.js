import cheerio from "cheerio";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node inspect-anchors.js <url>");
  process.exit(1);
}

async function fetchHtml(url) {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const response = await fetch(jinaUrl, {
    headers: {
      Accept: "application/json",
      "X-Return-Format": "html",
      "X-With-Images-Summary": "true",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data?.data?.content || data?.data?.html || "";
}

function summarizeAnchor($, el) {
  const $anchor = $(el);
  const $container = $anchor.closest("article");
  const info = {
    text: $anchor.text().trim().replace(/\s+/g, " "),
    ariaLabel: $anchor.attr("aria-label") || null,
    title: $anchor.attr("title") || null,
    dataTitle: $anchor.attr("data-title") || null,
    href: $anchor.attr("href") || null,
    ownText: $anchor
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim()
      .replace(/\s+/g, " ") || null,
    heading: $container.find("h1, h2, h3, h4").first().text().trim().replace(/\s+/g, " ") || null,
    summary: $container.find("p").first().text().trim().replace(/\s+/g, " ") || null,
  anchorSnippet: $.html($anchor).replace(/\s+/g, " ").slice(0, 500),
  };
  if ($container.length) {
    info.containerClass = $container.attr("class") || null;
    info.containerSnippet = $container.html()?.trim().slice(0, 800) || null;
  }
  return info;
}

async function run() {
  const html = await fetchHtml(target);
  const $ = cheerio.load(html);
  const anchors = [];
  $("article a[href]").each((index, el) => {
    if (anchors.length < 5) {
      anchors.push(summarizeAnchor($, el));
    }
  });
  console.log(JSON.stringify(anchors, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
