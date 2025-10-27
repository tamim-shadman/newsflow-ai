import handler from '../api/reddit.js';

const subreddit = process.argv[2] || 'news';

const req = {
  method: 'GET',
  query: { subreddit, limit: '10' },
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
    console.log('headers', this.headers);
    console.log(JSON.stringify(payload, null, 2));
  },
  end() {
    console.log('end');
  },
};

await handler(req, res);
