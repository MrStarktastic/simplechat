const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

users = [];
msgCount = 0;

server.listen(process.env.Port || 3000);
console.log('Server running...');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

function doesUsernameExist(username) {
    for (let i = 0; i < users.length; ++i) {
        if (username === users[i].name) {
            return true;
        }
    }

    return false;
}

io.sockets.on('connection', (socket) => {
    console.log('New socket detected');

    // Register new user
    socket.on('new user', (username, callback) => {
        // Registration failed
        if (doesUsernameExist(username)) {
            callback(false);
            return;
        }

        // Registration successful
        let rColor = Math.round(0xffffff * Math.random());
        rColor = ('#0' + rColor.toString(16)).replace(/^#0([0-9a-f]{6})$/i, '#$1');
        const nUser = {name: username, color: rColor};
        callback(true, socket.user = nUser, users);
        console.log('%s has joined the chat', username);

        // Send the new username to everyone
        users.push(nUser);
        socket.broadcast.emit('add user', nUser);
    });

    // Send message to recipients
    socket.on('send message', (msg, callback) => {
        console.log(msg);
        const msgId = msgCount++;
        callback(msgId);
        socket.broadcast.emit('receive message', {user: socket.user, msgId: msgId, msg: msg});
    });

    socket.on('delete message', (msgId) => {
        socket.broadcast.emit('remove message', msgId);
    });

    // Notify active users of this user's disconnection
    socket.on('disconnect', () => {
        const name = socket.user.name;
        console.log('%s disconnected', name);

        let removeIdx = 0;
        for (; removeIdx < users.length; ++removeIdx) {
            if (users[removeIdx].name === name) break;
        }

        users.splice(removeIdx, 1);
        io.sockets.emit('remove user', removeIdx);
    });
});
