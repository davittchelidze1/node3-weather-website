const request = require('request') 


const forecast = (longitude,latitude, callback) => {
    const url = 'http://api.weatherstack.com/current?access_key='+ process.env.WEATHERSTACK_API_KEY +'&query='+ latitude  + ',' +  longitude
    request({url, json:true}, (error, {body}) =>{
        if (error){
            callback('Unable to connect to weather service!', undefined)
        } else if (body.error){
            callback('unable to find the location',undefined)
        } else
            callback(undefined, body.current.weather_descriptions[0] + '. It is currently ' + body.current.temperature + 
          ' degrees out. It feels like '+ body.current.feelslike +' degrees out. The humidity is ' + body.current.humidity + '%.')
    }
    )
}

module.exports = forecast