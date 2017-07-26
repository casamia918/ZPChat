const _ = require('lodash');
const cluster = require('cluster');
const ioServer = require('socket.io');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const promisify = require('util.promisify');
const config = require(__dirname+'/config/main');
const redis = require('redis');
const socketRedis = require('socket.io-redis');
const Util = require('util');
const User = require(__dirname+'/models/user');
const Room = require(__dirname+'/models/room');
const mongoose = require('mongoose');
const sessionService = require('./services/session.js'); 

const ObjectId = mongoose.Schema.Types.ObjectId;

const pub = redis.createClient(config.redisUrl);
const sub = redis.createClient(config.redisUrl);

exports.init = function(httpServer) {

  const io = new ioServer(httpServer, {
    path: '/socket'
  });
  
  io.adapter(socketRedis({pubClient: pub, subClient: sub}));

  io.use((socket,next)=>{
    sessionService.parser(socket.request, socket.request.res, next);
  });
 
  io.use((socket,next)=>{
    passport.initialize()(socket.request, socket.request.res, next);
  });
  
  io.use((socket,next)=>{
    passport.session()(socket.request, socket.request.res, next);
  });
  
  io.use((socket,next)=>{
    if(socket.request.isAuthenticated()) {
      console.log('user', socket.request.user)
      next();
    } else {
      next(new Error('login required'));
    }
  });

  io.use((socket,next)=>{
    const roomNumber = socket.handshake.query.room;
    const req = socket.request;
    Room.findOne({number: roomNumber})
    .then( room => {
      if(room) {
        if(room.hasParticipant(req.user._id)) {
          req.locals = {room};
          next();
        } else {
          throw new Error('You\'re not joined to the room');
        }
      } else {
        throw new Error('Can not find room');
      }
    })
    .catch( e => {
      next(e);
    });
  });

  io.on('connection', function(socket) {
    console.log('cpu', process.env.CPU_NUM)
    console.log('socket.id', socket.id, 'CPU_NUM', process.env.CPU_NUM);
    const req = socket.request;
    socket.userId = req.user._id;
    socket.username = req.user.username;
    const roomNumber = socket.handshake.query.room;
    socket.roomNumber = roomNumber;

    socket.join(roomNumber);
    closeUsersSameRoomSocket(socket);

    socket.emit('chat', {
      args: ['알림', `${req.locals.room.name} 에 입장하셨습니다.`, false]
    })
    socket.to(roomNumber).emit('chat', {
      args: ['알림', `${socket.username} 님이 입장하셨습니다.`, false]
    })
    const allSockets = io.of('/').connected;
    const currentRoomUsernames = [];
    for(var scId in allSockets) {
      if(allSockets[scId].roomNumber === roomNumber) {
        currentRoomUsernames.push(allSockets[scId].username);
      }
    }
    io.of('/').to(roomNumber).emit('chat', {
      args: ['현재 참가자', `${currentRoomUsernames.join()}`, false]
    })
    socket.emit('chat', {
      args: ['단축키', `(마우스를 캔버스 위에 올린 상태에서)<br>[c]:clear, [e]:eraser, [wheel-up&down]:change line-width`, false]
    })

    socket.on('message', function(data) {
      console.log('server receive', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('disconnet', socket.id, reason);
      console.log('roomNumber', roomNumber);
      const allSockets = io.of('/').connected;
      const currentRoomConnectedSockets = _.values(allSockets).filter(s => {
        return s.userId === socket.userId && s.id !== socket.id && s.roomNumber === socket.roomNumber
      })
      if(currentRoomConnectedSockets.length === 0) {
        console.log('Remaied conneced socket 0');
        leaveRoom(socket);
      }
    });

    socket.on('chat', data => {
      data.args.unshift(socket.username);
      data.args.push(false); // isMyMessage : false
      socket.broadcast.to(roomNumber).emit('chat', data);
    });

    socket.on('draw', data => {
      socket.broadcast.to(roomNumber).emit('draw', data);
    });

    socket.on('clearCanvas', ()=>{
      socket.broadcast.to(roomNumber).emit('clearCanvas');
    });
      
    socket.on('loadCanvas', cb => {
      io.in(roomNumber).clients((err, clientIds)=>{
        if(err) {
          return cb(err);
        }
        console.log('room client ids', clientIds);
        console.log('requester id', socket.id);
        if(clientIds.length <= 1 ) {
          return cb();
        }
        const targetId = clientIds.find(cId => cId !== socket.id)
        console.log('target id', targetId);
        const targetSocket = io.of('/').connected[targetId];
        if(targetSocket) {
          targetSocket.emit('saveCurrentCanvas', data => {
            cb(data);
          })
        }
      })
    })

    socket.on('getUsername', cb => {
      cb(socket.username);
    })

    function closeUsersSameRoomSocket(socket) {
      const allSockets = io.of('/').connected;
      const targetSockets = _.values(allSockets).filter(s => {
        return s.userId === socket.userId && s.id !== socket.id && s.roomNumber === socket.roomNumber
      })
      const closeSockets = targetSockets.map(ts => {
        return new Promise((resolve,reject)=>{
          ts.disconnect(true);
          resolve();
        })
      })
      Promise.all(closeSockets);
    }

    function leaveRoom(socket) {
      const roomNumber = socket.roomNumber;
      const userId = socket.userId;
      Room.findOne({number: roomNumber})
      .then( room => {
        if(room) {
          console.log('leave room');
          return room.leave(userId);
        } else {
          throw new Error('Can not find room');
        }
      })
      .catch(e => {
        console.error(e);
      });
    }

  });


};

