require('dotenv').config();
const http = require('http');
const https = require('https');
const { readFileSync } = require('fs');
const express = require('express');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';

const httpsOptions = {
  key: readFileSync('./ssl/cloudflare/private.pem'),
  cert: readFileSync('./ssl/cloudflare/public.pem'),
};

const app = next({
  dev,
  dir: './src',
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  // Define app routes

  // handling everything else with Next.js
  server.get('*', handle);

  // we can add some utils from /bin/www
  http.createServer(server).listen(process.env.PORT, () => {
    console.log(`listening on port ${process.env.PORT}`);
  });

  https.createServer(httpsOptions, server).listen(process.env.PORT2, () => {
    console.log(`listening on port ${process.env.PORT2}`);
  });
});
