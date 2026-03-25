// ---- DOM refs ----
const loginSection  = document.getElementById('login-section')
const chatSection   = document.getElementById('chat-section')
const anonJoin      = document.getElementById('anonymous-join')
const authForm      = document.getElementById('auth-form')
const usernameInput = document.getElementById('username-input')
const joinAnonBtn   = document.getElementById('join-anon-btn')
const showLoginBtn  = document.getElementById('show-login-btn')
const cancelAuthBtn = document.getElementById('cancel-auth-btn')
const loginBtn      = document.getElementById('login-btn')
const signupBtn     = document.getElementById('signup-btn')
const authEmail     = document.getElementById('auth-email')
const authPassword  = document.getElementById('auth-password')
const authError     = document.getElementById('auth-error')
const chatWelcome   = document.getElementById('chat-welcome')
const logoutBtn     = document.getElementById('logout-btn')
const messagesEl    = document.getElementById('messages')
const messageForm   = document.getElementById('message-form')
const messageInput  = document.getElementById('message-input')
const userListEl    = document.getElementById('user-list')

let socket = null
let loggedInUsername = null  // set when the user completes a mock login

// ---- Show / hide auth form ----
showLoginBtn.addEventListener('click', () => {
    anonJoin.style.display = 'none'
    authForm.style.display = 'flex'
})

cancelAuthBtn.addEventListener('click', () => {
    authForm.style.display = 'none'
    anonJoin.style.display = 'flex'
    authError.textContent = ''
})

// ---- Join as guest ----
joinAnonBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim() || ('Guest_' + Date.now().toString(36))
    enterChat(name, false)
})

// ---- Login (username/password stored in session only — no external auth) ----
loginBtn.addEventListener('click', () => {
    const email = authEmail.value.trim()
    const password = authPassword.value
    if (!email || !password) {
        authError.textContent = 'Please enter both email and password.'
        return
    }
    authError.textContent = ''
    // Derive a display name from the email prefix
    loggedInUsername = email.split('@')[0]
    enterChat(loggedInUsername, true)
})

// ---- Sign up (same as login — no persistence needed for this demo) ----
signupBtn.addEventListener('click', () => {
    const email = authEmail.value.trim()
    const password = authPassword.value
    if (!email || !password) {
        authError.textContent = 'Please enter both email and password.'
        return
    }
    authError.textContent = ''
    loggedInUsername = email.split('@')[0]
    enterChat(loggedInUsername, true)
})

// ---- Logout ----
logoutBtn.addEventListener('click', () => {
    loggedInUsername = null
    if (socket) socket.disconnect()
    socket = null
    chatSection.style.display = 'none'
    loginSection.style.display = 'block'
    anonJoin.style.display = 'flex'
    authForm.style.display = 'none'
    authError.textContent = ''
    messagesEl.innerHTML = ''
    userListEl.innerHTML = ''
})

// ---- Enter chat ----
function enterChat (username, isLoggedIn) {
    loginSection.style.display = 'none'
    chatSection.style.display = 'block'
    chatWelcome.textContent = 'Chatting as: ' + username + (isLoggedIn ? ' ✓' : ' (guest)')
    logoutBtn.style.display = isLoggedIn ? 'inline-block' : 'none'

    socket = io()
    socket.emit('join', { username })
    messageInput.focus()

    socket.on('message', ({ username: sender, text, system }) => {
        const div = document.createElement('div')
        div.classList.add('message')
        if (system) {
            div.classList.add('system-msg')
            div.textContent = text
        } else {
            const nameSpan = document.createElement('span')
            nameSpan.classList.add('msg-user')
            nameSpan.textContent = sender + ':'
            div.appendChild(nameSpan)
            div.appendChild(document.createTextNode(' ' + text))
        }
        messagesEl.appendChild(div)
        messagesEl.scrollTop = messagesEl.scrollHeight
    })

    socket.on('userList', (users) => {
        userListEl.innerHTML = ''
        users.forEach((u) => {
            const li = document.createElement('li')
            li.textContent = u
            // "Add friend" button only for logged-in users viewing other users
            if (isLoggedIn && u !== username) {
                const btn = document.createElement('button')
                btn.textContent = '+ Friend'
                btn.classList.add('friend-btn')
                btn.title = 'Send friend request (requires login)'
                btn.addEventListener('click', () => sendFriendRequest(username, u))
                li.appendChild(btn)
            }
            userListEl.appendChild(li)
        })
    })
}

// ---- Send message ----
messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = messageInput.value.trim()
    if (!text || !socket) return
    socket.emit('sendMessage', { text })
    messageInput.value = ''
    messageInput.focus()
})

// ---- In-page notification ----
function showNotification (text) {
    const div = document.createElement('div')
    div.classList.add('message', 'system-msg')
    div.textContent = text
    messagesEl.appendChild(div)
    messagesEl.scrollTop = messagesEl.scrollHeight
}

// ---- Friend request (requires login) ----
function sendFriendRequest (from, to) {
    if (!loggedInUsername) {
        showNotification('You must be logged in to send friend requests.')
        return
    }
    socket.emit('friendRequest', { from, to })
    showNotification('Friend request sent to ' + to + '!')
}
