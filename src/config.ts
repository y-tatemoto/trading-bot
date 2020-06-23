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
        // turtle: {
        //     lot: 0.01,
        //     candleSize: 30, //分足
        //     entry: 30, //エントリー判定に使う足期間
        //     close: 7, //クローズ判定に使う足期間
        // },
        turtle: {
            lot: 0.2,
            candleSize: 240, //分足
            entry: 30, //エントリー判定に使う足期間
            close: 7, //クローズ判定に使う足期間
        },
        trap: {
            lot: 0.05,
            quantity: 5,
            basePrice: 1072026,
            openRangePrice: 10000,
            closeRangePrice: 8000,
        },
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
