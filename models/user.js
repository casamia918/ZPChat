const mongoose = require('../services/mongoose.js').mongoose;
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const maxUsernameLength = 20;
const minUsernameLength = 2;

const UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    validate: [
      {validator: makeLengthValidator('max', maxUsernameLength), msg: `Maximum username length is ${maxUsernameLength}`},
      {validator: makeLengthValidator('min', minUsernameLength), msg: `Minimum username length is ${minUsernameLength}`},
    ],
    required: true
  },
  password: {
    type: String,
    required: true
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

UserSchema.pre('save', function (next) {
  const user = this;
  const SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  const self = this;
  bcrypt.compare(candidatePassword, self.password, (err, isMatch) => {
    if (err) { return cb(err); }
    cb(null, isMatch);
  });
};

UserSchema.methods.getUserInfo = function() {
  return {
    _id: this._id,
    username: this.username
  }
}

module.exports = mongoose.model('User', UserSchema);
