import handler from '../api/scrape-site.js';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node run-scrape.js <url>');
  process.exit(1);
}

const req = {
  method: 'GET',
  query: { url: target },
};

const res = {
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    this.headers[name] = value;
  },
  json(payload) {
    console.log('status', this.statusCode);
    console.log(JSON.stringify(payload, null, 2));
  },
  end() {
    console.log('end');
  },
};

await handler(req, res);
