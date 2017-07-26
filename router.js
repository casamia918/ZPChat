const express = require('express');
const passport = require('passport');
require('./services/passport.js');

const AuthenticationController = require('./controllers/authentication.js');
const MainController = require('./controllers/main.js');
const RoomController = require('./controllers/room.js');
const ChatController = require('./controllers/chat.js');
const UserController = require('./controllers/user.js');

const loginAuthenticator = passport.authenticate('local', { failureRedirect: '/', failureFlash: true});

const isAuthenticated = function (req, res, next) {
  if(req.isAuthenticated()) return next();
  res.redirect('/auth/login');
}

const routes = express.Router();
const authRoutes = express.Router();
const mainRoutes = express.Router();
const roomRoutes = express.Router();
const chatRoutes = express.Router();
const userRoutes = express.Router();

////////////////////////////////////////////
// Auth Routes
////////////////////////////////////////////

authRoutes.get('/login', function(req, res, next) {
  res.render('auth/login', {message: req.flash('error')[0]});
});

authRoutes.post('/login', loginAuthenticator, AuthenticationController.renderMain);

authRoutes.get('/register', function(req,res,next) {
  res.render('auth/register', {message: req.flash('error')[0]});
});

authRoutes.post('/register', AuthenticationController.register);

authRoutes.get('/logout', isAuthenticated, AuthenticationController.logout)

////////////////////////////////////////////
// Main Routes
////////////////////////////////////////////

mainRoutes.get('/', isAuthenticated, MainController.index)

mainRoutes.get('/room-list', isAuthenticated, MainController.roomList)

////////////////////////////////////////////
// Room Routes
////////////////////////////////////////////

roomRoutes.post('/', isAuthenticated, RoomController.create);

roomRoutes.get('/:roomNumber/joinable', isAuthenticated, RoomController.joinable);

roomRoutes.put('/:roomNumber', isAuthenticated, RoomController.join);


roomRoutes.get('/:roomNumber', isAuthenticated, RoomController.get);




////////////////////////////////////////////
// Chat Routes
////////////////////////////////////////////






////////////////////////////////////////////
// User Routes
////////////////////////////////////////////







routes.use('/auth', authRoutes);
routes.use('/main', mainRoutes);
routes.use('/room', roomRoutes);
routes.use('/chat', chatRoutes);
routes.use('/user', userRoutes);


routes.get('*', function(req,res) {
  res.redirect('/main')
})

module.exports = routes;
