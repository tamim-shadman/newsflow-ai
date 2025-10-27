const target = process.argv[2];
if (!target) {
  console.error('Usage: node fetch-jina.js <url>');
  process.exit(1);
}

async function run() {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(target)}`;
  const res = await fetch(jinaUrl, {
    headers: {
      Accept: 'application/json',
      'X-Return-Format': 'html',
      'X-With-Images-Summary': 'true',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const html = data?.data?.content || data?.data?.html || '';
  const matches = [...html.matchAll(/href="(.*?)"/gi)]
    .map((m) => m[1])
    .filter((href) => href && href.includes('/news/'))
    .slice(0, 50);

  console.log(matches.join('\n'));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
