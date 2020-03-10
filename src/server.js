require('dotenv').config();
const http = require('http');
const https = require('https');
const { readFileSync } = require('fs');
const express = require('express');
const next = require('next');
const session = require('express-session');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const uid = require('uid-safe');

const authRoutes = require('./auth-routes');

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

  // Add session management to Express
  const sessionConfig = {
    secret: uid.sync(18),
    cookie: {
      maxAge: 86400 * 1000, // 24 hours in milliseconds
      secure: server.get('env') === 'production',
    },
    resave: false,
    saveUninitialized: true,
  };

  server.use(session(sessionConfig));

  // Configuring Auth0Strategy
  const auth0Strategy = new Auth0Strategy(
    {
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      callbackURL: process.env.AUTH0_CALLBACK_URL,
    },
    function(accessToken, refreshToken, extraParams, profile, done) {
      return done(null, profile);
    }
  );

  // Configuring Passport
  passport.use(auth0Strategy);
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  // Adding Passport and authentication routes
  server.use(passport.initialize());
  server.use(passport.session());

  // Define app routes
  server.use(authRoutes);

  // handling everything else with Next.js
  server.get('*', (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    handle(req, res, next);
  });

  // we can add some utils from /bin/www
  http.createServer(server).listen(process.env.PORT, () => {
    console.log(`listening on port ${process.env.PORT}`);
  });

  https.createServer(httpsOptions, server).listen(process.env.PORT2, () => {
    console.log(`listening on port ${process.env.PORT2}`);
  });
});
