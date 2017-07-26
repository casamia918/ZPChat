const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const config = require('../config/main');

const sessionParser = session({
  store: new RedisStore({url: config.redisUrl}),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true
})

exports.parser = sessionParser;
