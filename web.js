var express = require('express');
var store = new express.session.MemoryStore;

var app = express.createServer();
app.configure(function(){
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({
    secret: "Cra5TephaDrAc7bRedawuk4ch9n2Jewr",
    key: "typeracer",
    store: store
  }));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + 'public/index.html');
});

var users = [];
var io = require('socket.io').listen(app);
var chat = io.sockets.on('connection', function (socket) {
  var user;

  socket.on('user_join', function(user) {
    console.log("user_join: " + user.nickname);
    users.push(user);
    socket.broadcast.emit('user_join', user);
  });
  socket.on('player_ready', function() {
    console.log("player_ready: " + user.nickname);
  });
  socket.on('update', function (data) {
    socket.broadcast.emit('update', {user: user, data: data});
  });
  socket.on('disconnect', function() {
    var idx = users.indexOf(user);
    users.splice(idx, 1);

    socket.broadcast.emit('user_leave', user);
  });
});

app.listen(3001);

