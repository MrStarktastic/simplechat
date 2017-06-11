$(() => {
    const socket = io.connect();

    const $container = $('.container');
    const $userFormArea = $container.find($('#userFormArea'));
    const $userForm = $userFormArea.find($('#userForm'));
    const $username = $userForm.find($('#username'));
    const $loginButton = $userForm.find($('#loginButton'));

    let username = '';

    $username.bind('input', () => {
        $loginButton.prop('disabled', (username = $username.val().trim()) === '');
    });

    // Login
    $userForm.submit((e) => {
        e.preventDefault();

        if (username !== '') {
            socket.emit('new user', username, (success, user = null, otherUsers = null) => {
                console.log("***********Hello callback**********");
                if (success) {
                    $userFormArea.hide(250);
                    $container.load('client/chat.html', () => {
                        initChat(socket, user, otherUsers, $container);
                    });
                } else {
                    alert('Username "' + username + '" already exists!');
                }
            });
        }
    });
});

const usersTyping = new Set();
let wasTyping = false;

function initChat(socket, user, otherUsers, $container) {
    const $chatArea = $container.find($('#chatArea'));
    const $chat = $chatArea.find($('#chat'));
    const $users = $chatArea.find($('#users'));
    const $messageForm = $chatArea.find($('#messageForm'));
    const $message = $messageForm.find($('#message'));
    const $sendBtn = $messageForm.find($('#sendButton'));
    const $isTyping = $messageForm.find($('#isTyping'));

    let currMsg = ''; // The text that currently resides in the input field
    const delBtn = '<button style="float: right;" type="button" class="btn btn-danger btn-xs">X</button>';

    // Populate username list
    let html = '';
    for (let i = 0; i < otherUsers.length; ++i) {
        html += createUserListItem(otherUsers[i]);
    }
    $users.html(html);
    $(createUserListItem(user, true)).appendTo($users);

    $chatArea.show(250);

    $message.bind('input', () => {
        if ((currMsg = $message.val().trim()) === '') {
            $sendBtn.prop('disabled', true);

            if (wasTyping) {
                wasTyping = false;
                socket.emit('stopped typing', user.name);
            }
        } else {
            $sendBtn.prop('disabled', false);

            if (!wasTyping) {
                wasTyping = true;
                socket.emit('started typing', user.name);
            }
        }
    });

    // Send message
    $messageForm.submit((e) => {
        e.preventDefault();

        if (currMsg !== '') {
            const $msgdiv = appendMsgToChatArea(user, currMsg, delBtn);

            socket.emit('send message', currMsg, (msgId) => {
                $msgdiv.prop('id', msgId);
            });

            wasTyping = false;
            $sendBtn.prop('disabled', true);
            $message.val(currMsg = '');
        }
    });

    // Receive message from another user
    socket.on('receive message', (data) => {
        onStoppedTyping(data.user.name);
        appendMsgToChatArea(data.user, data.msg).prop('id', data.msgId);
    });

    // Other user deleted his message
    socket.on('delete message', (msgId) => {
        $chat.find('#' + msgId).hide(() => {
            $(this).remove();
        });
    });

    // Listen to message deletion requests
    $chat.on('click', '.btn', (e) => {
        const $elemToRemove = $(e.currentTarget).parent();
        socket.emit('delete message', $elemToRemove.attr('id'));

        $elemToRemove.hide(() => {
            $elemToRemove.remove();
        });
    });

    socket.on('started typing', (name) => {
        usersTyping.add(name);

        $isTyping.text(genIsTypingText());
        $isTyping.show();
    });

    socket.on('stopped typing', (name) => onStoppedTyping(name));

    // Add new username
    socket.on('add user', (user) => {
        $(createUserListItem(user)).hide().appendTo($users).slideDown();
    });

    // Remove username
    socket.on('remove user', (id) => {
        $users.find('#' + id).remove();
    });

    /**
     * Creates a list item for the list of active users.
     * @param user Username and his color.
     * @param isThis Specifies whether it's this user.
     * @return string list-group-item of the username.
     */
    function createUserListItem(user, isThis = false) {
        const name = isThis ? user.name + ' (You)' : user.name;
        return '<li id="' + name + '" class = "list-group-item" dir="auto" style="color: ' + user.color + '">' +
            name + '</li>';
    }

    /**
     * Creates and appends a well for a message to be shown in the chat area.
     * @param user Sender.
     * @param msg Message content.
     * @param delBtn A delete button (only when the message is from this user).
     * @return div of message.
     */
    function appendMsgToChatArea(user, msg, delBtn = '') {
        return $('<div style="display: none;" class = "well"><strong style="color: ' + user.color + '">' +
            user.name + '</strong> -' + ' ' + new Date().toLocaleTimeString() + delBtn + '<br>' + msg + '<div>')
            .appendTo($chat).slideDown();
    }

    function onStoppedTyping(name) {
        usersTyping.delete(name);

        if (usersTyping.size !== 0) {
            $isTyping.text(genIsTypingText());
            $isTyping.show();
        } else {
            $isTyping.hide();
        }
    }

    function genIsTypingText() {
        const usersTypingArr = [...usersTyping];
        let str = usersTypingArr[0];

        if (usersTyping.size === 1) {
            str += ' is typing...';
        } else {
            for (let i = 1; i < usersTypingArr.length - 1; ++i) {
                str += ', ' + usersTypingArr[i];
            }

            str += ' and ' + usersTypingArr[usersTypingArr.length - 1] + ' are typing...';
        }

        return str;
    }
}
