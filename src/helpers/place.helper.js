'use strict'

const getDistance = async ({
    latOrigin,
    longOrigin,
    latDestination,
    longDestination,
}) => {
    try {
        const distanceMatrixAPI =
            `https://rsapi.goong.io/DistanceMatrix?` +
            `origins=${latOrigin},${longOrigin}` +
            `&destinations=${latDestination},${longDestination}` +
            `&vehicle=car` +
            `&api_key=${global.config.get(`DISTANCEMATRIX_API_KEY`)}`

        let response = await fetch(distanceMatrixAPI).catch((error) => {
            console.error(`Error get distance`, error)
        })
        response = await response.json()
        return response
    } catch (error) {
        global.logger.error(`Error get distance`, error.message)
    }
}

const getPlaceDetail = async ({ cid }) => {
    try {
        var myHeaders = new Headers()
        myHeaders.append('X-API-KEY', `${global.config.get(`PLACE_X_API_KEY`)}`)
        myHeaders.append('Content-Type', 'application/json')

        var raw = JSON.stringify({
            cid: cid,
        })

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow',
        }

        const data = await fetch(`${global.config.get(`PLACE_URL`)}`, requestOptions)
        const convertData = await data.json()
        const result = convertData.places
        return result[0]
    } catch (error) {
        global.logger.error(`Error get place detail`, error.message)
    }
}

module.exports = {
    getDistance,
    getPlaceDetail,
}
