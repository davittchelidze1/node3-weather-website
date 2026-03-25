const path = require('path')
const http = require('http')
const crypto = require('crypto')
const express = require('express')
const { Server } = require('socket.io')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const hbs = require('hbs')
require('dotenv').config()
const geocode = require('./utils/geocode')
const forecast = require('./utils/forecast')


const app = express()
const server = http.createServer(app)
const io = new Server(server)
const port = process.env.PORT || 3000

// In-memory user store (username -> { passwordHash, friends[] })
const users = {}

// Session middleware (shared with Socket.io)
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'weather-chat-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
    }
})
app.use(sessionMiddleware)

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// CSRF token middleware: generates a token per session and validates on state-changing requests
function generateCsrfToken(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex')
    }
    return req.session.csrfToken
}

function validateCsrf(req, res, next) {
    const token = req.body._csrf || req.headers['x-csrf-token']
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).send('Invalid CSRF token')
    }
    next()
}

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname,'../public')
const viewsPath = path.join(__dirname,'../templates/views')
const partialsPath = path.join(__dirname,'../templates/partials')

// Setup handlebars engine and views location
app.set('view engine','hbs')
app.set('views',viewsPath)
hbs.registerPartials(partialsPath)

// setup static directory to serve
app.use(express.static(publicDirectoryPath))

app.get('',(req,res)=>{
    res.render('index', {
        title: 'weather app',
        name: 'Datochela',
        user: req.session.username || null
    })
})
 

app.get('/about',(req,res)=>{
    res.render('about',{
        title: 'about me',
        name: 'Datochela',
        user: req.session.username || null
    })
})

app.get('/help',(req,res)=>{
    res.render('help',{
        helptext: 'hey, help',
        title: 'help',
        name: 'Datochela',
        user: req.session.username || null
    })
})



app.get('/chat',(req,res)=>{
    const user = req.session.username || null
    res.render('chat',{
        title: 'chat',
        name: 'Datochela',
        user,
        currentUserJson: JSON.stringify(user),
        csrfToken: generateCsrfToken(req)
    })
})

// Login page
app.get('/login',(req,res)=>{
    if (req.session.username) {
        return res.redirect('/')
    }
    res.render('login',{
        title: 'login',
        name: 'Datochela',
        user: null,
        error: null,
        isRegister: false,
        csrfToken: generateCsrfToken(req)
    })
})

// Register page
app.get('/register',(req,res)=>{
    if (req.session.username) {
        return res.redirect('/')
    }
    res.render('login',{
        title: 'register',
        name: 'Datochela',
        user: null,
        error: null,
        isRegister: true,
        csrfToken: generateCsrfToken(req)
    })
})

// Handle login POST
app.post('/login', validateCsrf, async (req,res)=>{
    const { username, password } = req.body
    if (!username || !password) {
        return res.render('login',{
            title: 'login', name: 'Datochela', user: null,
            error: 'Username and password are required', isRegister: false,
            csrfToken: generateCsrfToken(req)
        })
    }
    const user = users[username]
    if (!user) {
        return res.render('login',{
            title: 'login', name: 'Datochela', user: null,
            error: 'Invalid username or password', isRegister: false,
            csrfToken: generateCsrfToken(req)
        })
    }
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
        return res.render('login',{
            title: 'login', name: 'Datochela', user: null,
            error: 'Invalid username or password', isRegister: false,
            csrfToken: generateCsrfToken(req)
        })
    }
    req.session.username = username
    res.redirect(303, '/chat')
})

// Handle register POST
app.post('/register', validateCsrf, async (req,res)=>{
    const { username, password } = req.body
    if (!username || !password) {
        return res.render('login',{
            title: 'register', name: 'Datochela', user: null,
            error: 'Username and password are required', isRegister: true,
            csrfToken: generateCsrfToken(req)
        })
    }
    if (users[username]) {
        return res.render('login',{
            title: 'register', name: 'Datochela', user: null,
            error: 'Username already taken', isRegister: true,
            csrfToken: generateCsrfToken(req)
        })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    users[username] = { passwordHash, friends: [] }
    req.session.username = username
    res.redirect(303, '/chat')
})

// Logout
app.get('/logout',(req,res)=>{
    req.session.destroy()
    res.redirect('/')
})

// Friend request API
app.post('/api/friend-request', validateCsrf, (req,res)=>{
    if (!req.session.username) {
        return res.status(401).json({ error: 'Login required to add friends' })
    }
    const { targetUsername } = req.body
    if (!targetUsername) {
        return res.status(400).json({ error: 'Target username is required' })
    }
    if (!users[targetUsername]) {
        return res.status(404).json({ error: 'User not found' })
    }
    const me = req.session.username
    if (me === targetUsername) {
        return res.status(400).json({ error: 'Cannot add yourself as a friend' })
    }
    const myFriends = users[me].friends
    if (!myFriends.includes(targetUsername)) {
        myFriends.push(targetUsername)
    }
    res.json({ success: true })
})



app.get('/weather',(req,res)=>{
    if (!req.query.address){
        return res.send({
            error: 'You must provide the address'
        })
    }
    geocode(req.query.address,(error,{longitude, latitude, location} = {}) =>{
        if (error) {
            return res.send({error})
        }
        forecast(longitude,latitude,(error,forecastData)=>{
            if (error){
                return res.send({error})
            }
            res.send({
                forecast: forecastData,
                location,
                address: req.query.address
            })
        })
    })
})



app.get('/products',(req,res)=>{
    if(!req.query.search){
        return res.send({
            error: 'You must provide a search term'

            }
        )

    }
    console.log(req.query.search)
    res.send({products: []})
    

})

app.get('/help/*',(req,res)=>{
    res.render('404',{
        errorMessage: 'Help article not found',
        title: 'Error',
        name: 'Datochela',
        user: req.session.username || null
    })
}

)

app.get('*',(req,res)=>{

    res.render('404',{
        errorMessage: ' 404 page',
        title: 'Error',
        name: 'Datochela',
        user: req.session.username || null
    })
})


// Socket.io chat
const onlineUsers = {}

// Share Express session with Socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next)
})

io.on('connection', (socket) => {
    // Use server-side session username; fall back to anonymous display name
    const sessionUsername = socket.request.session && socket.request.session.username
    const displayName = sessionUsername || ('anonymous-' + Math.random().toString(36).slice(2, 7))
    onlineUsers[socket.id] = displayName

    io.emit('users', Object.values(onlineUsers))
    socket.broadcast.emit('system', `${displayName} joined the chat`)

    socket.on('message', (text) => {
        if (typeof text !== 'string' || text.trim() === '') return
        io.emit('message', { from: displayName, text: text.trim() })
    })

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id]
        io.emit('users', Object.values(onlineUsers))
        io.emit('system', `${displayName} left the chat`)
    })
})

server.listen(port, ()=>{
    console.log('Server is up on port ' + port)
})
