// Firebase config — replace with your project's config values
// or set via a /api/firebase-config endpoint to avoid hardcoding
const FIREBASE_CONFIG = window.__firebaseConfig || null

// ---- Firebase Auth (optional) ----
let firebaseAuth = null
let currentUser = null  // { uid, email } when logged in, null for guests

function initFirebase () {
    if (!FIREBASE_CONFIG) return
    if (!window.firebase) return
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG)
        }
        firebaseAuth = firebase.auth()
        firebaseAuth.onAuthStateChanged((user) => {
            currentUser = user || null
        })
    } catch (e) {
        console.warn('Firebase init failed:', e)
    }
}

initFirebase()

// ---- DOM refs ----
const loginSection    = document.getElementById('login-section')
const chatSection     = document.getElementById('chat-section')
const anonJoin        = document.getElementById('anonymous-join')
const authForm        = document.getElementById('auth-form')
const usernameInput   = document.getElementById('username-input')
const joinAnonBtn     = document.getElementById('join-anon-btn')
const showLoginBtn    = document.getElementById('show-login-btn')
const cancelAuthBtn   = document.getElementById('cancel-auth-btn')
const loginBtn        = document.getElementById('login-btn')
const signupBtn       = document.getElementById('signup-btn')
const authEmail       = document.getElementById('auth-email')
const authPassword    = document.getElementById('auth-password')
const authError       = document.getElementById('auth-error')
const chatWelcome     = document.getElementById('chat-welcome')
const logoutBtn       = document.getElementById('logout-btn')
const messagesEl      = document.getElementById('messages')
const messageForm     = document.getElementById('message-form')
const messageInput    = document.getElementById('message-input')
const userListEl      = document.getElementById('user-list')

let socket = null

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

// ---- Firebase login ----
loginBtn.addEventListener('click', async () => {
    if (!firebaseAuth) {
        authError.textContent = 'Firebase is not configured on this server.'
        return
    }
    authError.textContent = ''
    try {
        const cred = await firebaseAuth.signInWithEmailAndPassword(
            authEmail.value.trim(),
            authPassword.value
        )
        currentUser = cred.user
        const displayName = cred.user.email.split('@')[0]
        enterChat(displayName, true)
    } catch (e) {
        authError.textContent = e.message
    }
})

// ---- Firebase signup ----
signupBtn.addEventListener('click', async () => {
    if (!firebaseAuth) {
        authError.textContent = 'Firebase is not configured on this server.'
        return
    }
    authError.textContent = ''
    try {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(
            authEmail.value.trim(),
            authPassword.value
        )
        currentUser = cred.user
        const displayName = cred.user.email.split('@')[0]
        enterChat(displayName, true)
    } catch (e) {
        authError.textContent = e.message
    }
})

// ---- Logout ----
logoutBtn.addEventListener('click', async () => {
    if (firebaseAuth) {
        await firebaseAuth.signOut()
        currentUser = null
    }
    if (socket) socket.disconnect()
    chatSection.style.display = 'none'
    loginSection.style.display = 'block'
    anonJoin.style.display = 'flex'
    authForm.style.display = 'none'
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
            // Only show "Add friend" button when the viewer is logged in and it's not themselves
            if (isLoggedIn && u !== username) {
                const btn = document.createElement('button')
                btn.textContent = '+ Friend'
                btn.classList.add('friend-btn')
                btn.title = 'Send friend request (requires login)'
                btn.addEventListener('click', () => sendFriendRequest(u))
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
function sendFriendRequest (targetUsername) {
    if (!currentUser) {
        showNotification('You must be logged in to send friend requests.')
        return
    }
    // Use display name (email prefix) to avoid exposing full email to other participants
    const displayFrom = currentUser.email.split('@')[0]
    socket.emit('friendRequest', {
        from: displayFrom,
        to: targetUsername
    })
    showNotification('Friend request sent to ' + targetUsername + '!')
}
