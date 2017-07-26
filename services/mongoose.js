const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const path = require('path');
const config = require(path.join(__dirname,'../config/main'));

mongoose.promise = Promise;
mongoose.connect(config.database, {
  useMongoClient: true
});
autoIncrement.initialize(mongoose.connection);

exports.mongoose = mongoose;
exports.autoIncrement = autoIncrement;
