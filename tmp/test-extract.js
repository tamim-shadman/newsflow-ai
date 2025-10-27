import fs from 'node:fs/promises';
import handler from '../api/scrape-site.js';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node test-extract.js <url>');
  process.exit(1);
}

const req = {
  method: 'GET',
  query: { url },
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
    console.log(JSON.stringify(payload, null, 2));
  },
  end() {
    console.log('end');
  },
};

await handler(req, res);
