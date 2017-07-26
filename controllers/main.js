const _ = require('lodash');
const promisify = require('util.promisify');
const Room = require('../models/room');

exports.index =  function(req, res, next) {
  console.log('MainController#index');
  Room.find()
  .sort({number: 'asc'})
  .then( rooms => {
    res.setHeader('Cache-Control', 'no-cache');
    res.render('main/index', {username: req.user.username, rooms: rooms});
  });
}


exports.roomList =  function(req, res, next) {
  Room.find()
  .sort({number: 'asc'})
  .then( rooms => {
    res.setHeader('Cache-Control', 'no-cache');
    res.render('main/room-list', {username: req.user.username, rooms: rooms}, (err, html)=>{
      res.send(html);
    });
  });
}
