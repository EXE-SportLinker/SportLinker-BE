const helmet = require('helmet')
const compression = require('compression')
const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const config = require('./configs/index')
// secure app by setting various HTTP headers
app.use(helmet())
// compress all responses
app.use(compression())
// parse application/json
app.use(express.json())
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
// config morgan
const morganFormat = config.get('NODE_ENV') === 'production' ? 'combined' : 'dev'
app.use(morgan(morganFormat)) // log requests to the console
// config cors]
const corsOptions = {
    // allow multiple domains
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}
app.use(cors(corsOptions))
// init global variable
global.config = config
// test function
;(async () => {
    await require('./databases/redis/redis.config').connect()
    await require('./databases/mysql/mysql.config').connect()
})()
//init route
// app.use('/v1', require('./routes/index'))

app.get('/', (req, res) => {
    res.json({
        message: 'hello',
    })
})
// handle error
app.use((req, res, next) => {
    const error = new Error('Not found')
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    const statusCode = error.status || 500
    res.status(statusCode).json({
        status: 'error',
        code: statusCode,
        message: error.message || 'Internal Server Error',
    })
})

module.exports = app
