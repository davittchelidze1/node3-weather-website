const path = require('path')
const express = require('express')
const hbs = require('hbs')
require('dotenv').config()
const geocode = require('./utils/geocode')
const forecast = require('./utils/forecast')


const app = express()

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

app.listen(3000, ()=>{
    console.log('Server is up on port 3000')
})
