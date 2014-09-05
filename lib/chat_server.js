var socketio = require('socket.io');
var io;
var guestNum = 1;
var nickNames = {};
var usedNickNames = [];
var currentRoom = {};

function handleClientDisconnect (socket) {
    socket.on('disconnect', function () {
        var nameIndex = usedNickNames.indexOf(nickNames[socket.id]);
        delete usedNickNames[nameIndex];
        delete nickNames[socket.id];
    });
}

function handleRoomJoin (socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleMessageBroadcasting (socket) {
    socket.on('message', function (message) {
        console.log(message);
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

function handleNameChangeAttempts (socket, nickNames, usedNickNames) {
    socket.on('nameAttempt', function (name) {
        if (name.indexOf('Guest') === 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Name cannot begin with "Guest".'
            });

        } else {
            if (usedNickNames.indexOf(name) === -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = usedNickNames.indexOf(previousName);
                usedNickNames.push(name);
                nickNames[socket.id] = name;
                delete usedNickNames[previousNameIndex];

                socket.emit('nameResult', {
                    success: true,
                    name: name
                });

            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

function assignGuestName (socket, guestNum, nickNames, usedNickNames) {
    var name = 'Guest' + guestNum;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });

    usedNickNames.push(name);
    return guestNum + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room: room});
    socket.broadcast.to(room).emit('message', {text: nickNames[socket.id] + ' has joined ' + room + '.'});

    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users in '  + room + ': ';

        for(var i in usersInRoom) {
            var userSocketId = usersInRoom[i].id;

            if (userSocketId != socket.id) {
                if (i > 0) {
                    usersInRoomSummary += ', ';
                }

                usersInRoomSummary += nickNames[userSocketId];
            }
        }

        usersInRoomSummary += '.';
        socket.emit('message', {text: usersInRoomSummary});
    }
}

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        guestNum = assignGuestName(socket, guestNum, nickNames, usedNickNames);
        joinRoom(socket, 'Lobby');

    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, usedNickNames);
    handleRoomJoin(socket);

    socket.on('rooms', function () {
        socket.emit('rooms', io.sockets.manager.rooms);
    });

    handleClientDisconnect(socket, nickNames, usedNickNames);
    });
}