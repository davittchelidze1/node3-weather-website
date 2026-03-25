const forecast = async (longitude, latitude, callback) => {
    const url = 'https://api.weatherstack.com/current?access_key=' +
        process.env.WEATHERSTACK_API_KEY +
        '&query=' + latitude + ',' + longitude
    try {
        const response = await fetch(url)
        if (!response.ok) {
            return callback('Weather service returned an error', undefined)
        }
        const body = await response.json()
        if (body.error) {
            return callback('Unable to find the location', undefined)
        }
        const { weather_descriptions, temperature, feelslike, humidity } = body.current
        callback(undefined,
            weather_descriptions[0] +
            '. It is currently ' + temperature +
            ' degrees out. It feels like ' + feelslike +
            ' degrees out. The humidity is ' + humidity + '%.'
        )
    } catch (error) {
        callback('Unable to connect to weather service!', undefined)
    }
}

module.exports = forecast