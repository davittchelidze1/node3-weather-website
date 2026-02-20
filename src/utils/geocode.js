const request = require('request')


const geocode = (address,callback) => {
    const url = "https://api.mapbox.com/search/geocode/v6/forward?q="+ encodeURIComponent(address) +"&access_token="+ process.env.MAPBOX_ACCESS_TOKEN +"&limit=1"
    request({url, json: true}, (error, {body}) =>{
        if (error){
            callback('Unable to connect to weather service!', undefined)
        }else if (body.features.length === 0) {
            callback('unable to find the location', undefined)
        }
        else{
            const longitude = (body.features[0].properties.coordinates.longitude)
            const latitude = (body.features[0].properties.coordinates.latitude)
            const location = (body.features[0].properties.name_preferred)
            callback(undefined,{
                latitude,
                longitude,
                location
            }
            )
        }



})
}

module.exports = geocode