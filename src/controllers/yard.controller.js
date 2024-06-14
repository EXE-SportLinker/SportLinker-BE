'use strict'

const { CREATED, Ok } = require('../core/sucess.response')
const YardService = require('../services/yard.service')

class YardController {
    async createYard(req, res, next) {
        new CREATED({
            message: 'Yard created successfully.',
            metadata: await YardService.createYard(req.body, req.params.stadium_id),
        }).send(res)
    }

    async getYards(req, res, next) {
        new Ok({
            message: 'Yards fetched successfully.',
            metadata: await YardService.getYards(req.params.stadium_id),
        }).send(res)
    }
}

module.exports = new YardController()