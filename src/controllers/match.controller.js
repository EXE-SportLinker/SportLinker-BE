'use strict'

const { CREATED, Ok } = require('../core/sucess.response')
const MatchService = require('../services/match.service')

class MatchController {
    async createNewMatch(req, res, next) {
        new CREATED({
            message: 'Match created successfully',
            metadata: await MatchService.createNewMatch(req.body, req.user.id),
        }).send(res)
    }

    async getListMatch(req, res, next) {
        new Ok({
            message: 'Get list match successfully',
            metadata: await MatchService.getListMatch(
                req.query.lat,
                req.query.long,
                req.query.distance,
                req.query.start_time,
                req.query.end_time,
                req.query.sport_name
            ),
        }).send(res)
    }

    async getMatchDetail(req, res, next) {
        new Ok({
            message: 'Get match detail successfully',
            metadata: await MatchService.getMatchDetail(req.params.match_id),
        }).send(res)
    }

    async deleteMatch(req, res, next) {
        new Ok({
            message: 'Delete match successfully',
            metadata: await MatchService.deleteMatch(req.params.match_id, req.user.id),
        }).send(res)
    }
}

module.exports = new MatchController()
