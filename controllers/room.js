const _ = require('lodash');
const promisify = require('util.promisify');
const User = require('../models/user');
const Room = require('../models/room');
const config = require('../config/main');
const {maxRoomParticipants} = require('../config/constants.js');

exports.create = function(req, res, next) {
  console.log('RoomController#create');
  const newRoom = new Room({
    name: req.body.name,
    password: req.body.password,
    master: req.user._id,
    participants: [req.user._id]
  })
  console.log('newRoom', newRoom);
  newRoom.save()
  .then( room => {
    console.log(room);
    res.send({redirect: `/room/${room.number}`})
  })
  .catch( e => {
    console.error(e);
    res.status(404).send({error: e.message || 'bad request'});
  });

}


exports.joinable = function(req, res, next) {
  console.log('RoomController#joinable');
  const roomNumber = req.params.roomNumber;
  
  findRoom(roomNumber)
  .then( room => {
    return promisify(room.joinable).call(room, req.user._id)
  })
  .then( (joinable, reason) => {
    res.send({joinable, message: reason})
  })
  .catch( e => {
    console.error(e);
    res.status(404).send({error: e.message || 'bad request'});
  });

}


exports.join = function(req,res,next) {
  console.log('RoomController#join');
  const roomNumber = req.params.roomNumber;
  const password = req.body && req.body.password // password is optional
  console.log('roomNumber', roomNumber);
  console.log('password', password);
  findRoom(roomNumber)
  .then( room => {
    return promisify(room.join).call(room, req.user._id, password)
    .then( room => {
      res.send({redirect: `/room/${room.number}`})
    }, e => {
      res.status(404).send({error: e.message});
    });
  })
  .catch(e => {
    return next(e);
  });
}


exports.get = function(req, res, next) {
  console.log('RoomController#get');
  const roomNumber = req.params.roomNumber;
  findRoom(roomNumber)
  .then( room => {
    if(room.hasParticipant(req.user._id)){
      res.render('room/index', {username: req.user.username, roomNumber: roomNumber});
    } else {
      const error = new Error(`You are not join room number of ${roomNumber}`);
      error.status = 401;
      throw error;
    }
  })
  .catch(e => {
    return next(e);
  });
  
}

function findRoom(number) {
  return Room.findOne({number})
  .then( room => {
    if(room) {
      return room;
    } else {
      console.log('room missing');
      const error = new Error(`Can not find room number of ${number}`);
      error.status = 404;
      throw error;
    }
  })
  
}
