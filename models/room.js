const mongoose = require('../services/mongoose.js').mongoose;
const _ = require('lodash');
const autoIncrement = require('../services/mongoose.js').autoIncrement;
const Schema = mongoose.Schema;
const {
  maxNameLength, 
  minNameLength, 
  maxPasswordLength, 
  maxRoomParticipants
} = require('../config/constants.js').room;
  
const RoomSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    validate: [
      {validator: makeLengthValidator('max', maxNameLength), msg: `Maximum room name length is ${maxNameLength}`},
      {validator: makeLengthValidator('min', minNameLength), msg: `Minimum room name length is ${minNameLength}`}
    ]
  },
  number: {
    type: Number,
    unique: true,
    required: true
  },
  password: {
    type: String,
    validate: [
      {validator: makeLengthValidator('max', maxPasswordLength), msg: `Maximum room password length is ${maxPasswordLength}`}
    ]
  },
  master: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  participants: {
    type:  [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: [
      {validator: makeLengthValidator('max', maxRoomParticipants), msg: `Maximum room participants is ${maxRoomParticipants}`}
    ]
  }
});

function makeLengthValidator(type, length) {
  if(type === 'max') {
    return function(val) {
      return val.length <= length
    }
  } else if (type === 'min') {
    return function(val) {
      return val.length >= length
    }
  } else {
    throw new Error('Invalid validator type')
  }
}


RoomSchema.plugin(autoIncrement.plugin, {model:'Room', field: 'number', startAt: 1})

RoomSchema.methods.hasParticipant = function(userId) {
  const room = this;
  const idx = room.participants.indexOf(userId);
  return idx >= 0
}

RoomSchema.methods.addParticipant = function(userId, cb) {
  const room = this;
  room.participants.push(userId);
  room.save( (err, room) => {
    if(err) return cb(err);
    cb(null, room);
  });
}

RoomSchema.methods.isFull = function() {
  return this.participants.length >= maxRoomParticipants;
}


RoomSchema.methods.isPrivate = function() {
  return !_.isEmpty(this.password);
}


RoomSchema.methods.joinable = function(userId, cb) {
  console.log('room#joinable')
  if(this.hasParticipant(userId)) {
    return cb(null, true);
  }
  if(this.isFull()){
    return cb(null, false, 'Room is full');
  } else {
    return cb(null, true);
  }
}

RoomSchema.methods.join = function(userId, password, cb) {
  console.log('room#join')
  const room = this;

  room.joinable(userId, (err, joinable, reason) => {
    if(err) return cb(err);
    if(!joinable) {
      const error = new Error(reason);
      return cb(err);
    }

    if(room.hasParticipant(userId)) {
      cb(null, room); 
    } else {
      if(room.isPrivate()) {
        if(room.comparePassword(password)) {
          return room.addParticipant(userId, cb);
        } else {
          const error = new Error('Incorrect password');
          return cb(error);
        }
      } else {
        return room.addParticipant(userId, cb);
      }
    }
  });


}

RoomSchema.methods.leave = function(userId) {
  const room = this;
  room.participants.pull(userId);
  if(room.participants.length === 0) {
    return room.remove(); 
  }
  if(room.master.equals(userId)) {
    room.master = room.participants[0];
  }
  return room.save();
}


RoomSchema.methods.comparePassword = function(password) {
  const room = this;
  return room.password === password;
}

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;
