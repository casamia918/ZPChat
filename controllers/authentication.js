const _ = require('lodash');
const promisify = require('util.promisify');
const User = require('../models/user');
const helpers = require('../helpers');
const config = require('../config/main');
const passport = require('passport');
const request = require('request');
const passwordValidator = require('../services/password-validator.js');

exports.register = function(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  const p = new Promise((resolve, reject)=>{
    if(_.isEmpty(username)) {
      throw new Error('username required');
    }

    if(_.isEmpty(password)) {
      throw new Error('password required');
    }

    if(!passwordValidator.validate(password)) {
      throw new Error('Invalid password format');
    }
    
    return resolve();
  })

  p
  .then(()=>{
    const captchaResponse = req.body['g-recaptcha-response']
    const form = {
      secret: config.captchaSecret,
      response: captchaResponse
    }
    return promisify(request.post)({url:'https://www.google.com/recaptcha/api/siteverify', form: form})
    .then( (httpResponse)=>{
      const body = JSON.parse(httpResponse.body)
      if(body.success) {
        return;
      } else {
        throw new Error('reCAPTCHA test fail')
      }
    })
  })
  .then(()=>{
    return User.findOne({username})
  })
  .then( existingUser => {
    if(existingUser) {
      throw new Error('That username is already existing');
    }
    const user = new User({
      username, password
    })
    return user.save();
  })
  .then( user => {
    return new Promise((resolve,reject)=>{
      req.login(user, (err) => {
        if(err) return reject(err);
        resolve();
      });
    });
  })
  .then( () => {
    res.redirect('/main');
  })
  .catch( e => {
    req.flash('error', e.message || 'Error while register');
    res.status(422).redirect('register');
  });
}

exports.renderMain = function(req, res, next) {
  res.redirect('/main')
}


exports.logout = function(req, res, next) {
  req.session.destroy((err)=>{
    res.redirect('/');
  });
}
