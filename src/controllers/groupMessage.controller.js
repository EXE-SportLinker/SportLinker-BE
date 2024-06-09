'use strict'

const { CREATED, Ok, NO_CONTENT } = require('../core/sucess.response')
const GroupMessageService = require('../services/groupMessage.service')

class groupMessageController {
    async getListGroupMessageByUser(req, res, next) {
        new Ok({
            message: 'Match created successfully',
            metadata: await GroupMessageService.getListGroupMessageByUser(req.user.id),
        }).send(res)
    }
}

module.exports = new groupMessageController()