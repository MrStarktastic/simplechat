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
            socket.emit('new user', username, (success, otherUsers = null) => {
                if (success) {
                    $userFormArea.hide(250);
                    $container.load('client/chat.html', () => initChat(socket, username, otherUsers, $container));
                } else {
                    alert('Username "' + username + '" already exists!');
                }
            });
        }
    });
});

function initChat(socket, username, otherUsers, $container) {
    const $chatArea = $container.find($('#chatArea'));
    const $chat = $chatArea.find($('#chat'));
    const $users = $chatArea.find($('#users'));
    const $messageForm = $chatArea.find($('#messageForm'));
    const $message = $messageForm.find($('#message'));
    const $sendBtn = $messageForm.find($('#sendButton'));

    let currMsg = ''; // The text that currently resides in the input field
    const delBtn = '<button style="float: right;" type="button" class="btn btn-danger btn-xs">X</button>';

    // Populate username list
    let html = '';
    for (let i = 0; i < otherUsers.length; ++i) {
        html += createUserListItem(otherUsers[i]);
    }
    $users.html(html);
    $(createUserListItem(username)).appendTo($users);

    $chatArea.show(250);

    $message.bind('input', () => {
        $sendBtn.prop('disabled', (currMsg = $message.val().trim()) === '');
    });

    // Send message
    $messageForm.submit((e) => {
        e.preventDefault();

        if (currMsg !== '') {
            const $msgdiv = appendToChatArea(username, currMsg, delBtn);

            socket.emit('send message', currMsg, (msgId) => {
                $msgdiv.prop('id', msgId);
            });

            $sendBtn.prop('disabled', true);
            $message.val(currMsg = '');
        }
    });

    // Receive message from another user
    socket.on('receive message', (data) => {
        appendToChatArea(data.user, data.msg).prop('id', data.msgId);
    });

    // Other user deleted his message
    socket.on('remove message', (msgId) => {
        $chat.find('#' + msgId).hide(() => {
            $(this).remove();
        });
    });

    // Listen to message deletion requests
    $chat.on('click', '.btn', (e) => {
        const $elemToRemove = $(e.currentTarget).parent();
        const removeId = $elemToRemove.attr('id');

        $elemToRemove.hide(() => {
            $elemToRemove.remove();
            socket.emit('delete message', removeId);
        });
    });

    // Add new username
    socket.on('add user', (username) => {
        $(createUserListItem(username)).hide().appendTo($users).slideDown();
    });

    // Remove username
    socket.on('remove user', (index) => {
        $users.children('li:eq(' + index + ')').remove();
    });

    /**
     * Creates a list item for the list of active users.
     * @param username Username string.
     * @return string list-group-item of the username.
     */
    function createUserListItem(username) {
        return '<li class = "list-group-item" dir="auto" >' + username + '</li>';
    }

    /**
     * Creates and appends a well for a message to be shown in the chat area.
     * @param user Sender.
     * @param msg Message content.
     * @param delBtn A delete button (only when the message is from this user).
     * @return div of message.
     */
    function appendToChatArea(user, msg, delBtn = '') {
        const dt = new Date($.now());
        const time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
        return $('<div style="display: none;" class = "well"><strong>' + user + '</strong> -' +
            ' ' + time + delBtn + '<br>' + msg + '<div>').appendTo($chat).slideDown();
    }
}
