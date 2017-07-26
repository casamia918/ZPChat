const config = require('../config/main');
const User = require('../models/user');
const LocalStrategy = require('passport-local');
const helpers = require('../helpers.js');
const promisify = require('util.promisify');
const passport = require('passport');

const localLogin = new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
}, (username, password, done) => {
  User.findOne({username})
  .then( user => {
    if (!user) { 
      done(null, false, { message: `Can not found user of \'${username}\'` }); 
    } else {
      const comparePasswordAsync = promisify(user.comparePassword).bind(user)
      comparePasswordAsync(password)
      .then( isMatch => {
        if(!isMatch) {
          done(null, false, { message: 'Incorrect password Please try again.' }); 
        }
        done(null, user);
      })
    }
  })
  .catch( e => {
    done(e);
  });
});

passport.serializeUser((user,done)=>{
  done(null, user.getUserInfo());
})

passport.deserializeUser((user,done)=>{
  done(null, user);
})

passport.use(localLogin);

