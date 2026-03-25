const path = require('path')
const http = require('http')
const express = require('express')
const hbs = require('hbs')
const { Server } = require('socket.io')
require('dotenv').config()
const geocode = require('./utils/geocode')
const forecast = require('./utils/forecast')


const app = express()
const server = http.createServer(app)
const io = new Server(server)
const port = process.env.PORT || 3000

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
        name: 'Datochela'
    })
})
 

app.get('/about',(req,res)=>{
    res.render('about',{
        title: 'about me',
        name: 'Datochela'
    })
})

app.get('/help',(req,res)=>{
    res.render('help',{
        helptext: 'hey, help',
        title: 'help',
        name: 'Datochela'
    })
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



app.get('/chat', (req, res) => {
    res.render('chat',{
        title: 'Chat',
        name: 'Datochela'
    })
})

// Chat room - track connected users (username -> socket id)
const connectedUsers = {}

io.on('connection', (socket) => {
    socket.on('join', ({ username }) => {
        socket.username = username || ('Guest_' + socket.id.slice(0, 6))
        connectedUsers[socket.id] = socket.username
        io.emit('userList', Object.values(connectedUsers))
        io.emit('message', {
            username: 'System',
            text: `${socket.username} has joined the chat`,
            system: true
        })
    })

    socket.on('sendMessage', ({ text }) => {
        if (!text || !text.trim()) return
        io.emit('message', {
            username: socket.username || 'Anonymous',
            text: text.trim()
        })
    })

    socket.on('friendRequest', ({ from, to }) => {
        // Notify the target user if they are online
        for (const [id, username] of Object.entries(connectedUsers)) {
            if (username === to) {
                io.to(id).emit('message', {
                    username: 'System',
                    text: `${from} sent you a friend request!`,
                    system: true
                })
                break
            }
        }
    })

    socket.on('disconnect', () => {
        if (socket.username) {
            delete connectedUsers[socket.id]
            io.emit('userList', Object.values(connectedUsers))
            io.emit('message', {
                username: 'System',
                text: `${socket.username} has left the chat`,
                system: true
            })
        }
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
        name: 'Datochela'
    })
}

)

app.get('*',(req,res)=>{

    res.render('404',{
        errorMessage: ' 404 page',
        title: 'Error',
        name: 'Datochela'
    })
})


server.listen(port, ()=>{
    console.log('Server is up on port ' + port)
})
