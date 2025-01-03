'use strict'

const { Ok, CREATED } = require('../core/sucess.response')
const BookingService = require('../services/booking.service')

class BookingController {
    async createBooking(req, res, next) {
        new CREATED({
            message: 'Create booking successfully',
            metadata: await BookingService.createBooking(req.body, req.user.id),
        }).send(res)
    }

    async updateBooking(req, res, next) {
        console.log(`req.body`, req.body)
        new Ok({
            message: 'Update booking successfully',
            metadata: await BookingService.updateBooking(req.params.booking_id, req.body),
        }).send(res)
    }

    async getAllBookingUser(req, res, next) {
        new Ok({
            message: 'Get all booking user successfully',
            metadata: await BookingService.getAllBookingUser(req.user.id),
        }).send(res)
    }

    async deleteBooking(req, res, next) {
        new Ok({
            message: 'Delete booking successfully',
            metadata: await BookingService.deleteBooking(req.params.booking_id),
        }).send(res)
    }

    async getAllBookingByAdmin(req, res, next) {
        new Ok({
            message: 'Get all booking by admin successfully',
            metadata: await BookingService.getAllBookingByAdmin(
                req.query.page_size,
                req.query.page_number
            ),
        }).send(res)
    }
}

module.exports = new BookingController()
