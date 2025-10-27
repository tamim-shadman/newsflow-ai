import handler from '../api/reddit.js';

const req = {
  method: 'GET',
  query: { subreddit: 'android', limit: '20' },
};

const res = {
  statusCode: 200,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    console.log('status', this.statusCode);
    console.log(JSON.stringify(payload, null, 2));
  },
  end() {},
};

await handler(req, res);
