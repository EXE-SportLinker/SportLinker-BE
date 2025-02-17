'use strict'

const express = require('express')
const router = express.Router()
const { asyncHandler } = require('../helpers/asyncHandler.helper')
const YardController = require('../controllers/yard.controller')
const { authentication } = require('../middlewares/auth.middleware')

router.use(authentication)

router.post('/:stadium_id', asyncHandler(YardController.createYard))

router.get('/getAllYardByOwner', asyncHandler(YardController.getAllYardByOwner))

router.get(
    '/getListYardByUser/:stadium_id',
    asyncHandler(YardController.getListYardByUser)
)

router.get(
    '/getListYardByOwner/:stadium_id',
    asyncHandler(YardController.getListYardByOwner)
)

router.get('/:yard_id', asyncHandler(YardController.getYardById))

router.put('/:yard_id', asyncHandler(YardController.updateYard))

router.delete('/:yard_id', asyncHandler(YardController.deleteYard))

module.exports = router
