const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

users = [];
msgCount = 0; // Serves as msgId

server.listen(process.env.Port || 3000);
console.log('Server running...');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Allow the app to use files in this directory as src in html
app.use(express.static(__dirname));

io.sockets.on('connection', (socket) => {
    console.log('New socket detected');

    // Register new user
    socket.on('new user', (username, callback) => {
        // Registration failed
        if (users.includes(username)) {
            callback(false);
            return;
        }

        // Registration successful
        callback(true, users);
        console.log('%s has joined the chat', socket.username = username);

        // Send the new username to everyone
        users.push(username);
        socket.broadcast.emit('add user', username);
    });

    // Send message to recipients
    socket.on('send message', (msg, callback) => {
        console.log(msg);
        const msgId = msgCount++;
        callback(msgId);
        socket.broadcast.emit('receive message', {user: socket.username, msgId: msgId, msg: msg});
    });

    socket.on('delete message', (msgId) => {
        socket.broadcast.emit('remove message', msgId);
    });

    // Notify active users of this user's disconnection
    socket.on('disconnect', () => {
        console.log('%s disconnected', socket.username);
        const removeIdx = users.indexOf(socket.username);
        users.splice(removeIdx, 1);
        io.sockets.emit('remove user', removeIdx);
    });
});
