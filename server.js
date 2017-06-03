const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

const users = new Map();
let msgCount = 0;

server.listen(process.env.Port || 3000);
console.log('Server running...');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

io.sockets.on('connection', (socket) => {
    console.log('New socket detected');

    // Register new user
    socket.on('new user', (username, callback) => {
        // Registration failed
        if (users.has(username)) {
            callback(false);
            return;
        }

        // Registration successful
        const nUser = {name: username, color: genRandColor()};
        callback(true, socket.user = nUser, [...users.values()]);
        console.log('%s has joined the chat', username);

        // Send the new username to everyone else
        users.set(username, nUser);
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
        socket.broadcast.emit('delete message', msgId);
    });

    // Notify active users of this user's disconnection
    socket.on('disconnect', () => {
        let name;

        try {
            name = socket.user.name;
        } catch (err) {
        }

        console.log('%s disconnected', name);

        users.delete(name);
        io.sockets.emit('remove user', name);
    });

    socket.on('started typing', (name) => {
        socket.broadcast.emit('started typing', name);
    });

    socket.on('stopped typing', (name) => {
        socket.broadcast.emit('stopped typing', name);
    });
});

/**
 * Generates a random color to represent a new user.
 * @return {string} Hex color code.
 */
function genRandColor() {
    const rColor = Math.round(0xffffff * Math.random());
    return ('#0' + rColor.toString(16)).replace(/^#0([0-9a-f]{6})$/i, '#$1');
}
