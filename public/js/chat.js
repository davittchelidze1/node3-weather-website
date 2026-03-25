const socket = io()

const messagesEl = document.getElementById('chat-messages')
const onlineUsersEl = document.getElementById('online-users')
const chatForm = document.getElementById('chat-form')
const chatInput = document.getElementById('chat-input')

function appendMessage(html, className) {
    const div = document.createElement('div')
    div.className = 'chat-message ' + className
    div.innerHTML = html
    messagesEl.appendChild(div)
    messagesEl.scrollTop = messagesEl.scrollHeight
}

socket.on('message', ({ from, text }) => {
    const isMe = currentUser && from === currentUser
    appendMessage(
        '<span class="msg-author">' + escapeHtml(from) + ':</span> ' + escapeHtml(text),
        isMe ? 'chat-message--me' : 'chat-message--other'
    )
})

socket.on('system', (text) => {
    appendMessage('<em>' + escapeHtml(text) + '</em>', 'chat-message--system')
})

socket.on('users', (userList) => {
    onlineUsersEl.innerHTML = ''
    userList.forEach((name) => {
        const li = document.createElement('li')
        li.textContent = name
        if (currentUser && name !== currentUser) {
            const btn = document.createElement('button')
            btn.textContent = '+ Friend'
            btn.className = 'friend-btn'
            btn.addEventListener('click', () => addFriend(name, btn))
            li.appendChild(btn)
        }
        onlineUsersEl.appendChild(li)
    })
})

chatForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = chatInput.value.trim()
    if (!text) return
    socket.emit('message', text)
    chatInput.value = ''
})

function addFriend(targetUsername, btn) {
    if (!currentUser) {
        appendMessage('<em>You need to <a href="/login">login</a> or <a href="/register">register</a> to add friends.</em>', 'chat-message--system')
        return
    }
    btn.disabled = true
    fetch('/api/friend-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ targetUsername })
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                btn.textContent = '✓ Added'
            } else {
                btn.textContent = data.error || 'Error'
                btn.disabled = false
            }
        })
        .catch(() => {
            btn.textContent = 'Error'
            btn.disabled = false
        })
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
