// const mysql = require('mysql2')

// class MySQLConnection {
//     constructor() {
//         if (!MySQLConnection.instance) {
//             // this.pool = mysql.createPool({
//             //     host: global.config.get('MYSQL_HOST'),
//             //     port: global.config.get('MYSQL_PORT'),
//             //     user: global.config.get('MYSQL_USER'),
//             //     password: global.config.get('MYSQL_PASSWORD'),
//             //     database: global.config.get('MYSQL_DATABASE'),
//             // })
//             this.pool = mysql.createConnection({
//                 host: global.config.get('MYSQL_HOST'),
//                 port: global.config.get('MYSQL_PORT'),
//                 user: global.config.get('MYSQL_USER'),
//                 password: global.config.get('MYSQL_PASSWORD'),
//                 database: global.config.get('MYSQL_DATABASE'),
//             })
//             MySQLConnection.instance = this
//         }
//         return MySQLConnection.instance
//     }

//     async connect(type = 'mysql') {
//         // this.pool.getConnection((err, connection) => {
//         //     if (err) {
//         //         global.logger.error(`Error connecting to MySQL: ${err.message}`)
//         //         return
//         //     }
//         //     global.logger.info('Connected to MySQL')
//         //     connection.release()
//         // })
//         this.pool.connect((err) => {
//             if (err) {
//                 global.logger.error(`Error connecting to MySQL: ${err.message}`)
//                 return
//             }
//             global.logger.info('Connected to MySQL')
//         })
//     }

//     async disconnect() {
//         this.pool.end((err) => {
//             if (err) {
//                 global.logger.error(
//                     `Error disconnecting from MySQL: ${err.message}`
//                 )
//             }
//             global.logger.info('Disconnected from MySQL')
//         })
//     }
// }

// module.exports = new MySQLConnection()
