var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

var server = require("http").Server(app);
var io = require("socket.io")(server);

const PORT = 3000 || process.env.PORT;
server.listen(PORT, function(){
    console.log('Example app listening on port %d!', PORT);
});

var listUsers=[];
var listRoom=[];
let newRoom = {
  name: String,
  limit: Number
}

io.on("connection", function(socket){
  // client send username to server
  socket.on("Client-send-Username", function(data){
    if (data != ""){
      if(listUsers.indexOf(data)>=0){
        socket.emit("Server-send-registration-fail");
      }else{
        listUsers.push(data);
        socket.Username = data;
        socket.emit("Server-send-registration-success", data);
        io.sockets.emit("Server-send-users-list", listUsers);
      }
    } else {
      socket.emit("Box-blank", "Box cannot be blank");
    }
  });

  socket.on("Logout", function(){
    listUsers.splice(
      listUsers.indexOf(socket.Username), 1
    );
    socket.broadcast.emit("Server-send-users-list",listUsers);
    listRoom.splice(0);
    socket.broadcast.emit("Server-send-rooms-list", listRoom);
  });

  socket.on("Check-room", function(data){
    var DuplicateRoom = 0;
    for(r in socket.adapter.rooms){
      if (r == data){
        DuplicateRoom = 1;
      }
    }
    if (DuplicateRoom != 1){
      socket.emit("Room-doesn't-exist", data);
    } else {
      socket.emit("Room-exist", data);
    }
  });

  socket.on("Create-new-room", function(data){
    if (data != ""){
      socket.join(data);
      socket.Room = data;
      listRoom.splice(0);
      var number;
      let newRoom = {
        'name': data,
        'limit': number
      }
      socket.adapter.rooms[data].limit = 2;
      listRoom.push(newRoom.name);
      socket.emit("Server-send-room-success", newRoom.name);
      io.sockets.emit("Server-send-rooms-list", listRoom);
    } else {
      socket.emit("Box-blank", "Box cannot be blank");
    }
  });

  socket.on("Join-room", function(data){
    if (data != ""){
      let filterRoom = listRoom.filter(function(room){
        return room.name == data;
      });
      for(room in socket.adapter.rooms){
        if(data == room){
          if(socket.adapter.rooms[data].length < socket.adapter.rooms[data].limit){
            listRoom.splice(0);
            socket.join(room);
            socket.Room=data;
            socket.emit("Server-send-room-success", data);
            io.sockets.emit("Server-send-rooms-list", listRoom);
          }else{
            socket.emit("Reject-by-limited-members");
            io.sockets.emit("Server-send-rooms-list", listRoom);
          }
        }
      }    
    } else {
      socket.emit("Box-blank", "Box cannot be blank");
    }
  });

  socket.on("Leave", function(data){
    socket.leave(data);
    listRoom.splice(0);
    io.sockets.emit("Server-send-rooms-list", listRoom);
  });

  socket.on("User-send-message", function(data){
    io.sockets.in(socket.Room).emit("Server-send-mesage", formatMessage(socket.Username, data) );
  });

  socket.on("User-is-typing", function(){
    var s = socket.Username + " is typing";
    io.sockets.emit("Someone-is-typing", s);
  });

  socket.on("User-stop-typing", function(){
    io.sockets.emit("Someone-stop-typing");
  });

  socket.on("disconnect", function(){
    var index = listUsers.indexOf(socket.Username)
    var check = false;
    listUsers.splice(index, 1);

    io.sockets.emit("Server-send-users-list", listUsers);
  
    var listTempRoom = [];
    for(room in socket.adapter.rooms){
      if(room.length < 15){
        listTempRoom.push(room);
      }
    }

    var BackupRoom =[];
    for(var i = 0; i < listRoom.length; i++){
      for(var j = 0; j < listTempRoom.length; j++){
        if(listRoom[i].name == listTempRoom[j]){
          BackupRoom.push(listRoom[i]);
        }
      }
    }

    listRoom.splice(0);
    for(var i = 0; i < BackupRoom.length; i++){
      listRoom.push(BackupRoom[i]);
    }

    socket.emit("Server-send-rooms-list", listRoom);
    socket.broadcast.emit("Server-send-rooms-list", listRoom);
  });
});

app.get("/", function(req, res){
  res.render("Home");
});

var moment = require('moment');

function formatMessage(username, text){
return {
    username,
    text,
    time: moment().format('h:mm a')
    }
}
