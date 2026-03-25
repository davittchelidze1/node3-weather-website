const geocode = async (address, callback) => {
    const url = 'https://api.mapbox.com/search/geocode/v6/forward?q=' +
        encodeURIComponent(address) +
        '&access_token=' + process.env.MAPBOX_ACCESS_TOKEN +
        '&limit=1'
    try {
        const response = await fetch(url)
        if (!response.ok) {
            return callback('Geocoding service returned an error', undefined)
        }
        const body = await response.json()
        if (!body.features || body.features.length === 0) {
            return callback('Unable to find the location', undefined)
        }
        const { longitude, latitude } = body.features[0].properties.coordinates
        const location = body.features[0].properties.name_preferred
        callback(undefined, { latitude, longitude, location })
    } catch (error) {
        callback('Unable to connect to geocoding service!', undefined)
    }
}

module.exports = geocode