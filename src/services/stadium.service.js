'use strict'

const { BadRequestError } = require('../core/error.response')
const prisma = require('../configs/prisma.config').client
const { getDistance } = require('../helpers/place.helper')
const NotificationService = require('./notification.service')
const yardService = require('./yard.service')

class StadiumService {
    /**
     * @function createStadium
     * @param {*} data
     * @param {*} userId
     * @logic
     * 1. Find the stadium by long lat
     * 2. If stadium exists, return bad request
     * 3. If stadium does not exist, create stadium
     * 4. Return stadium
     */
    async createStadium(data, userId) {
        // 1. Find the stadium by long lat
        const isStadiumExist = await prisma.stadium.findFirst({
            where: {
                stadium_lat: data.stadium_lat,
                stadium_long: data.stadium_long,
            },
        })
        if (isStadiumExist) {
            throw new BadRequestError('Stadium already exists with the same location.')
        }
        // 2. create stadium
        const stadium = await prisma.stadium.create({
            data: {
                stadium_owner_id: userId,
                stadium_name: data.stadium_name,
                stadium_lat: data.stadium_lat,
                stadium_long: data.stadium_long,
                stadium_address: data.stadium_address,
                stadium_thumnail: data.stadium_thumnail,
                stadium_time: data.stadium_time,
                stadium_description: data.stadium_description,
            },
        })
        return stadium
    }

    /**
     * @function updateStadium
     * @param {*} lat
     * @param {*} long
     * @logic
     * 1. Get all stadium
     * 2. Calculate distance
     * 3. Sort by distance
     * 4. Return list stadium
     */

    async getStadiumByPlayer(lat, long) {
        const list_stadium = await prisma.stadium.findMany({
            include: {
                owner: true,
            },
            where: {
                stadium_status: 'approved',
            },
        })
        // get distance and sort by distance
        for (let i = 0; i < list_stadium.length; i++) {
            // wait 200ms
            await new Promise((resolve) => setTimeout(resolve, 200))
            const distance = await getDistance({
                latOrigin: lat,
                longOrigin: long,
                latDestination: list_stadium[i].stadium_lat,
                longDestination: list_stadium[i].stadium_long,
            })
            // set distance
            list_stadium[i].distance = distance.rows[0].elements[0].distance
            // find total rating
            const total_rating = await prisma.stadiumRating.count({
                where: {
                    stadium_id: list_stadium[i].id,
                },
            })
            list_stadium[i].total_rating = total_rating
        }
        list_stadium.sort((a, b) => a.distance.value - b.distance.value)
        return list_stadium
    }

    /**
     * @function getStadiumByOwner
     * @param {*} userId
     * @logic
     * 1. Find stadium by owner
     * 2. Return list stadium
     */

    async getStadiumByOwner(userId) {
        const list_stadium = await prisma.stadium.findMany({
            where: {
                stadium_owner_id: userId,
            },
        })

        return list_stadium
    }

    /**
     * @function getStadiumByAdmin
     * @logic
     * 1. Get all stadium
     * 2. Return list stadium
     * 3. Order by status and created_at
     * 4. Return list stadium
     */

    async getStadiumByAdmin(page_size, page_number) {
        page_size = parseInt(page_size)
        page_number = parseInt(page_number)

        const list_stadium = await prisma.stadium.findMany({
            include: {
                owner: true,
            },
            orderBy: [
                {
                    stadium_status: 'asc',
                },
                {
                    created_at: 'desc',
                },
            ],
            skip: page_size * (page_number - 1),
            take: page_size,
        })
        // find total_page
        const total_stadium = await prisma.stadium.count()
        const total_page = Math.ceil(total_stadium / page_size)
        return {
            list_stadium,
            total_page,
        }
    }

    /**
     * @function getStadiumById
     * @param {*} stadiumId
     * @logic
     * 1. Find stadium by id
     * 2. return stadium
     */

    async getStadiumById(stadiumId, userId) {
        const stadium = await prisma.stadium.findFirst({
            where: {
                id: stadiumId,
            },
            include: {
                yards: true,
                owner: true,
                ratings: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
            },
        })
        // find total rating
        const total_rating = await prisma.stadiumRating.count({
            where: {
                stadium_id: stadiumId,
            },
        })
        // check can rating
        const can_rating = await prisma.stadiumRating.findFirst({
            where: {
                stadium_id: stadiumId,
                user_id: userId,
            },
        })

        stadium.can_rating = can_rating ? true : false

        stadium.total_rating = total_rating ? total_rating : 0

        return stadium
    }

    /**
     * @function updateStadium
     * @param {*} userId
     * @param {*} stadiumId
     * @param {*} data
     * @logic
     * 1. Find stadium by id
     * 2. If stadium does not exist, return bad request
     * 3. If stadium exists, update stadium
     * 4. Return stadium
     */

    async updateStadium(userId, stadiumId, data) {
        // 1. Find stadium by id
        const stadium = await prisma.stadium.findUnique({
            where: {
                id: stadiumId,
            },
        })
        if (!stadium) {
            throw new BadRequestError('Stadium does not exist.')
        }
        // 2. check is owner
        if (stadium.stadium_owner_id !== userId) {
            throw new BadRequestError('You are not the owner of this stadium.')
        }
        // 3. Update stadium
        const updatedStadium = await prisma.stadium.update({
            where: {
                id: stadiumId,
            },
            data: {
                ...data,
            },
        })

        return updatedStadium
    }

    /**
     * @function deleteStadium
     * @param {*} stadiumId
     * @logic
     * 1. Find stadium by id
     * 2. If stadium does not exist, return bad request
     * 3. If stadium exists, delete stadium
     * 4. Return stadium
     */

    async deleteStadium(stadiumId, userId) {
        // get stadium by id
        const stadium = await prisma.stadium.findFirst({
            where: {
                id: stadiumId,
            },
        })
        // check is owner
        if (stadium.stadium_owner_id !== userId) {
            throw new BadRequestError('Bạn không có quyền hành này!')
        }
        // 1. find all yard in stadium
        const list_yard = await prisma.yard.findMany({
            where: {
                stadium_id: stadiumId,
            },
        })
        // find all booking yard in list yard
        for (let i = 0; i < list_yard.length; i++) {
            await yardService
                .deleteYard(list_yard[i].yard_id, stadium.stadium_owner_id)
                .catch((err) => {
                    throw new BadRequestError(err.message)
                })
        }
        // 2. delete stadium
        await prisma.stadium.update({
            where: {
                id: stadiumId,
            },
            data: {
                stadium_status: 'deleted',
            },
        })
        // send notification to admin and owner
        await NotificationService.createNotification({
            receiver_id: `${global.config.get(`ADMIN_ID`)}`,
            content: `Sân vận động ${stadium.stadium_name} của bạn đã bị xóa.`,
        })
        // send notification to owner
        await NotificationService.createNotification({
            receiver_id: stadium.stadium_owner_id,
            content: `Sân vận động ${stadium.stadium_name} đã bị xóa.`,
        })

        return stadium
    }

    /**
     * @function updateStatusStadium
     * @param {*} stadiumId
     * @param {*} data
     * @logic
     * 1. Find stadium by id
     * 2. If stadium does not exist, return bad request
     * 3. If stadium exists, update status
     * 4. Return stadium
     */

    async updateStatusStadium(stadiumId, data) {
        // 1. Find stadium by id
        const stadium = await prisma.stadium.findFirst({
            where: {
                id: stadiumId,
            },
        })
        if (!stadium) {
            throw new BadRequestError('Stadium does not exist.')
        }
        // 2. Update status
        const updatedStadium = await prisma.stadium.update({
            where: {
                id: stadiumId,
            },
            data: {
                stadium_status: data.stadium_status,
            },
        })
        // 3. Send notification to owner
        await NotificationService.createNotification({
            receiver_id: stadium.stadium_owner_id,
            content: `Sân vận động ${stadium.stadium_name} của bạn đã được ${data.stadium_status}.`,
        })
        return updatedStadium
    }

    /**
     * @function createRating
     * @param {*} data
     * @param {*} userId
     * @logic
     * 1. Find stadium by id
     * 2. If stadium does not exist, return bad request
     * 3. If stadium exists, create rating
     * 4. Return rating
     */

    async createRating(data, userId, stadiumId) {
        // 1. Find stadium by id
        const stadium = await prisma.stadium.findFirst({
            where: {
                id: stadiumId,
            },
        })
        if (!stadium) {
            throw new BadRequestError('Stadium does not exist.')
        }
        // 2. Create rating
        await prisma.stadiumRating.create({
            data: {
                stadium_id: stadiumId,
                user_id: userId,
                rating: data.rating,
                comment: data.comment,
            },
        })
        // 3. update rating in stadium
        const list_rating = await prisma.stadiumRating.findMany({
            where: {
                stadium_id: stadiumId,
            },
        })
        let total_rating = 0
        for (let i = 0; i < list_rating.length; i++) {
            total_rating += list_rating[i].rating
        }
        let average_rating = total_rating / list_rating.length

        average_rating = Number(average_rating.toFixed(1))

        // 4. Update rating in stadium
        await prisma.stadium.update({
            where: {
                id: stadiumId,
            },
            data: {
                stadium_rating: average_rating,
            },
        })
        // send notification to owner
        await NotificationService.createNotification({
            receiver_id: stadium.stadium_owner_id,
            content: `Sân vận động ${stadium.stadium_name} của bạn đã được đánh giá.`,
        })
        return `Rating created successfully.`
    }
}

module.exports = new StadiumService()
