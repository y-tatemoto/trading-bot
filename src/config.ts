import path from 'path'
require('dotenv').config()

const APP_ROOT = path.join(__dirname, './')

export default {
    bitflyer: {
        apiKey: process.env.BITFLYER_API_KEY,
        apiSecret: process.env.BITFLYER_API_SECRET,
        pair: 'BTC_JPY',
    },
    trade: {
        turtle: {
            lot: 0.1,
            candleSize: 30, //分足
            entry: 30, //エントリー判定に使う足期間
            close: 7, //クローズ判定に使う足期間
        },
        /*turtle: {
            lot: 0.001,
            candleSize: 1, //分足
            entry: 5, //エントリー判定に使う足期間
            close: 3, //クローズ判定に使う足期間
        },*/
    },
    log4js: {
        appenders: {
            access: {
                type: 'dateFile',
                filename: path.join(APP_ROOT, './log/system/access.log'),
            },
            error: {
                type: 'dateFile',
                filename: path.join(APP_ROOT, './log/system/error.log'),
            },
            system: {
                type: 'dateFile',
                filename: path.join(APP_ROOT, './log/system/system.log'),
            },
            console: {
                type: 'console',
            },
        },
        categories: {
            default: {
                appenders: ['access', 'console'],
                level: 'INFO',
            },
            access: {
                appenders: ['access', 'console'],
                level: 'INFO',
            },
            system: {
                appenders: ['system', 'console'],
                level: 'ALL',
            },
            error: {
                appenders: ['error', 'console'],
                level: 'WARN',
            },
        },
    },
}
