'use strict'

const prisma = require('../configs/prisma.config').client
const { BadRequestError } = require('../core/error.response')
const redis = require('../configs/redis.config').client
const { getPlaceDetail, getDistance } = require('../helpers/place.helper')
const { getStringHourAndMinut, getStringByDate } = require('../helpers/timestamp.helper')

class MatchService {
    /**
     *@function: Create New Match
     * @param {*} match
     * @param {*} user_create_id
     * @returns
     */
    async createNewMatch(match, user_create_id) {
        // convert time
        match.start_time = new Date(match.start_time)
        match.end_time = new Date(match.end_time)
        // find match exist
        const matchExist = await prisma.match
            .findFirst({
                where: {
                    user_create_id: user_create_id,
                    start_time: match.start_time,
                    status: 'upcomming',
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        if (matchExist) throw new BadRequestError('You have a match upcomming!')
        // create new match
        const newMatch = await prisma.match.create({
            data: {
                match_name: match.match_name,
                user_create_id: user_create_id,
                cid: match.cid,
                sport_name: match.sport_name,
                maximum_join: match.maximum_join,
                start_time: match.start_time,
                end_time: match.end_time,
            },
        })
        // create match join for user create
        const newUserJoin = await prisma.matchJoin
            .create({
                data: {
                    user_join_id: user_create_id,
                    match_id: newMatch.match_id,
                    status: 'accepted',
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        if (!newUserJoin) throw new BadRequestError('Create match join fail!')
        // create match option
        await prisma.matchOption.create({
            data: {
                match_id: newMatch.match_id,
                budget: match.option.budget,
                note: match.option.note,
            },
        })
        // Check cache stadium info is exist
        const stadiumInfo = await redis.get(`stadium:${match.cid}`)
        if (!stadiumInfo) {
            // get detail place of match
            const placeDetail = await getPlaceDetail({
                cid: match.cid,
            })
            // set cache stadium info
            await redis.set(`stadium:${match.cid}`, JSON.stringify(placeDetail))
        }
        // create message for match
        await prisma.groupMessage.create({
            data: {
                group_message_id: newMatch.match_id,
                group_message_name: newMatch.match_name,
                group_message_thumnail: `https://png.pngtree.com/png-clipart/20220124/original/pngtree-sports-logo-icon-picture-png-image_7179399.png`,
                type: 'match',
            },
        })
        // create group message join for owner
        await prisma.groupMessageJoin.create({
            data: {
                group_message_id: newMatch.match_id,
                user_join_id: user_create_id,
            },
        })
        // logs
        global.logger.info(`Create new match: ${newMatch.id} by user: ${user_create_id}`)
        return newMatch
    }

    /**
     *@function: Get List Match
     * @param {*} lat (lat origin of user)
     * @param {*} long (long origin of user)
     * @param {*} distance string (meters)
     * @param {*} start_time float (hour of day)
     * @param {*} end_time float (hour of day)
     * @param {*} sport_name array (sport name)
     */
    async getListMatch(lat, long, distance, start_time, end_time, sport_name, user_id) {
        if (!lat || !long) {
            throw new BadRequestError('Bạn chưa cung cấp vị trí của bạn!')
        }
        let listMatchByTimeAndSportName = []
        // check sport_name is empty
        if (!sport_name) {
            listMatchByTimeAndSportName = await prisma.match
                .findMany({
                    where: {
                        start_time: {
                            gte: new Date(),
                        },
                        status: 'upcomming',
                    },
                    orderBy: {
                        start_time: 'asc',
                    },
                    include: {
                        match_join: {
                            where: {
                                status: 'accepted',
                            },
                            include: {
                                user_join: true,
                            },
                        },
                    },
                })
                .catch((error) => {
                    global.logger.error(`Get list match fail: ${error.message}`)
                })
        } else {
            sport_name = sport_name.split(',')
            // 1. Get list match by sport name, now time and filter by time
            listMatchByTimeAndSportName = await prisma.match
                .findMany({
                    where: {
                        start_time: {
                            gte: new Date(),
                        },
                        sport_name: {
                            in: sport_name,
                        },
                        status: 'upcomming',
                    },
                    orderBy: {
                        start_time: 'asc',
                    },
                    include: {
                        match_join: {
                            where: {
                                status: 'accepted',
                            },
                            include: {
                                user_join: true,
                            },
                        },
                    },
                })
                .catch((error) => {
                    global.logger.error(`Get list match fail: ${error.message}`)
                })
        }

        // if list match empty return empty list
        if (listMatchByTimeAndSportName.length === 0) return []
        let list_match_by_distance_and_time = []
        // 3. Filter by distance and time
        for (let i = 0; i < listMatchByTimeAndSportName.length; i++) {
            // get start time of match
            let match_start_time =
                new Date(listMatchByTimeAndSportName[i].start_time).getHours() +
                new Date(listMatchByTimeAndSportName[i].start_time).getMinutes() / 60
            // 1. Get detail place of match
            let placeDetail = await redis.get(
                `stadium:${listMatchByTimeAndSportName[i].cid}`
            )
            placeDetail = JSON.parse(placeDetail)
            if (!placeDetail) {
                placeDetail = await getPlaceDetail({
                    cid: listMatchByTimeAndSportName[i].cid,
                })
                await redis.set(
                    `stadium:${listMatchByTimeAndSportName[i].cid}`,
                    JSON.stringify(placeDetail)
                )
            }
            // wait distance matrix to 30s
            await new Promise((resolve) => setTimeout(resolve, 200))

            // 2. Check distance of user and match
            let distanceMatrix = await getDistance({
                latOrigin: lat,
                longOrigin: long,
                latDestination: placeDetail.latitude,
                longDestination: placeDetail.longitude,
            })
            distanceMatrix = distanceMatrix.rows[0].elements[0].distance
            // 3. Check is owner of match
            if (listMatchByTimeAndSportName[i].user_create_id === user_id) {
                listMatchByTimeAndSportName[i].is_owner = true
            } else {
                listMatchByTimeAndSportName[i].is_owner = false
            }
            // 4. If valid distance and time valid push detail place to listMatch
            if (
                distanceMatrix.value <= distance &&
                start_time <= match_start_time &&
                end_time >= match_start_time
            ) {
                listMatchByTimeAndSportName[i].place_detail = placeDetail
                listMatchByTimeAndSportName[i].distance = distanceMatrix
                list_match_by_distance_and_time.push(listMatchByTimeAndSportName[i])
            }
        }
        // 4. Group by day
        let result = list_match_by_distance_and_time.reduce((acc, match) => {
            const date = getStringByDate(match.start_time)
            if (!acc[date]) {
                acc[date] = {
                    date: date,
                    match_group_by_date: [],
                }
            }
            acc[date].match_group_by_date.push(match)
            return acc
        }, {})
        result = Object.values(result)
        // loop to group by start_time
        for (let i = 0; i < result.length; i++) {
            const match_group_by_time = result[i].match_group_by_date.reduce(
                (acc, match) => {
                    const time = getStringHourAndMinut(match.start_time)
                    if (!acc[time]) {
                        acc[time] = {
                            time: time,
                            matches: [],
                        }
                    }
                    acc[time].matches.push(match)
                    return acc
                },
                {}
            )
            result[i].match_group_by_date = Object.values(match_group_by_time)
        }
        // 5. Return result
        return result
    }

    /**
     * @function: Get Match By User
     * @param {*} user_id
     */

    async getMatchByUser(user_id, lat, long) {
        if (!lat || !long) {
            throw new BadRequestError('Bạn chưa cung cấp vị trí của bạn!')
        }
        // 1. Get match by user
        const match_by_user = await prisma.match.findMany({
            where: {
                match_join: {
                    some: {
                        user_join_id: user_id,
                    },
                },
            },
            include: {
                user_create: true,
                option: true,
            },
            orderBy: [
                {
                    status: 'asc',
                },
                {
                    start_time: 'desc',
                },
            ],
        })
        // find distance and place_detail of user and match
        for (let i = 0; i < match_by_user.length; i++) {
            // 1. Get detail place of match
            let placeDetail = await redis.get(`stadium:${match_by_user[i].cid}`)
            placeDetail = JSON.parse(placeDetail)
            if (!placeDetail) {
                placeDetail = await getPlaceDetail({
                    cid: match_by_user[i].cid,
                })
                await redis.set(
                    `stadium:${match_by_user[i].cid}`,
                    JSON.stringify(placeDetail)
                )
            }
            // wait distance matrix to 30s
            await new Promise((resolve) => setTimeout(resolve, 200))

            // 2. Check distance of user and match
            let distanceMatrix = await getDistance({
                latOrigin: lat,
                longOrigin: long,
                latDestination: placeDetail.latitude,
                longDestination: placeDetail.longitude,
            })
            distanceMatrix = distanceMatrix.rows[0].elements[0].distance
            // push detail place to listMatch and distance
            match_by_user[i].place_detail = placeDetail
            match_by_user[i].distance = distanceMatrix
        }
        // combine by date
        let result = match_by_user.reduce((acc, match) => {
            const date = getStringByDate(match.start_time)
            if (!acc[date]) {
                acc[date] = {
                    date: date,
                    match_group_by_date: [],
                }
            }
            acc[date].match_group_by_date.push(match)
            return acc
        }, {})
        result = Object.values(result)
        // combine by time
        for (let i = 0; i < result.length; i++) {
            const match_group_by_time = result[i].match_group_by_date.reduce(
                (acc, match) => {
                    const time = getStringHourAndMinut(match.start_time)
                    if (!acc[time]) {
                        acc[time] = {
                            time: time,
                            matches: [],
                        }
                    }
                    acc[time].matches.push(match)
                    return acc
                },
                {}
            )
            result[i].match_group_by_date = Object.values(match_group_by_time)
        }

        return result
    }

    /**
     *@function: Get Match Detail
     * @param {*} match_id
     */

    async getMatchDetail(match_id, user_id) {
        // 1. Get match detail
        const matchDetail = await prisma.match
            .findUnique({
                where: {
                    match_id: match_id,
                },
                include: {
                    user_create: true,

                    match_join: {
                        where: {
                            status: 'accepted',
                        },
                        include: {
                            user_join: true,
                        },
                    },

                    option: true,
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        // 2. Get detail place of match
        let placeDetail = await redis.get(`stadium:${matchDetail.cid}`)
        placeDetail = JSON.parse(placeDetail)
        if (!placeDetail) {
            placeDetail = await getPlaceDetail({
                cid: matchDetail.cid,
            })
            await redis.set(`stadium:${matchDetail.cid}`, JSON.stringify(placeDetail))
        }
        matchDetail.place_detail = placeDetail
        // 3. Check is owner of match
        if (matchDetail.user_create.id === user_id) {
            matchDetail.is_owner = true
        } else {
            matchDetail.is_owner = false
        }
        // 4. Check is apptent to match
        const is_attendend = matchDetail.match_join.some(
            (match) => match.user_join.id === user_id
        )
        matchDetail.is_attendend = is_attendend
        // 3. Return result
        return matchDetail
    }

    /**
     *@function: delete Match
     * @param {*} match_id
     * @param {*} user_id
     */

    async deleteMatch(match_id, user_id) {
        // 1. Check user is user create of match
        const match = await prisma.match
            .findUnique({
                where: {
                    match_id: match_id,
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        if (match.user_create_id !== user_id) {
            throw new BadRequestError('You are not user create of this match!')
        }
        // 2. Delete match
        const deleteMatch = await prisma.match
            .update({
                where: {
                    match_id: match_id,
                },
                data: {
                    status: 'cancelled',
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        // 3. Return result
        return deleteMatch
    }

    /**
     *
     * @param {*} match_id
     * @param {*} user_id
     * @param {*} data
     */

    async updateMatch(match_id, user_id, data) {
        // 1. Check user is user create of match
        const match = await prisma.match
            .findUnique({
                where: {
                    match_id: match_id,
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        if (match.user_create_id !== user_id) {
            throw new BadRequestError('You are not user create of this match!')
        }
        // 2. Update match
        const updateMatch = await prisma.match
            .update({
                where: {
                    match_id: match_id,
                },
                data: {
                    match_name: data.match_name,
                    cid: data.cid,
                    sport_name: data.sport_name,
                    maximum_join: data.maximum_join,
                    start_time: data.start_time,
                    end_time: data.end_time,
                },
            })
            .catch((error) => {
                throw new BadRequestError(error)
            })
        // 3. Update match option
        if (data.option) {
            await prisma.matchOption
                .update({
                    where: {
                        match_id: match_id,
                    },
                    data: {
                        budget: data.option.budget,
                        note: data.option.note,
                    },
                })
                .catch((error) => {
                    throw new BadRequestError(error)
                })
        }
        // 3. Return result
        return 'Cập nhật thành công trận đấu thành công!'
    }

    /**
     *
     * @param {*} page_number
     * @param {*} page_size
     * @param {*} month
     * @param {*} year
     */

    async getAllMatchByAdmin(page_number, page_size, month, year) {
        // parse all param to int
        page_number = parseInt(page_number)
        page_size = parseInt(page_size)
        month = parseInt(month)
        year = parseInt(year)
        // 1. Get all match by admin
        const allMatchByAdmin = await prisma.match.findMany({
            where: {
                start_time: {
                    gte: new Date(`${year}-${month}-01`),
                    lt: new Date(`${year}-${month}-31`),
                },
            },
            skip: (page_number - 1) * page_size,
            take: page_size,
            orderBy: [
                {
                    status: 'asc',
                },
                {
                    start_time: 'desc',
                },
            ],
            include: {
                user_create: true,
                option: true,
            },
        })
        // get detail place of match
        for (let i = 0; i < allMatchByAdmin.length; i++) {
            let placeDetail = await redis.get(`stadium:${allMatchByAdmin[i].cid}`)
            placeDetail = JSON.parse(placeDetail)
            if (!placeDetail) {
                placeDetail = await getPlaceDetail({
                    cid: allMatchByAdmin[i].cid,
                })
                await redis.set(
                    `stadium:${allMatchByAdmin[i].cid}`,
                    JSON.stringify(placeDetail)
                )
            }
            allMatchByAdmin[i].place_detail = placeDetail
        }
        // count total match
        const totalMatch = await prisma.match.count({
            where: {
                start_time: {
                    gte: new Date(`${year}-${month}-01`),
                    lt: new Date(`${year}-${month}-31`),
                },
            },
        })
        // check total page
        const total_page = Math.ceil(totalMatch / page_size)
        return {
            matches: allMatchByAdmin,
            total_page: total_page,
        }
    }
}

module.exports = new MatchService()
