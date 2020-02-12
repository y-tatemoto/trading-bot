import bitflyer from '../../api/bitflyer'
import cryptoWatch from '../../api/cryptoWatch'
import strategy from '../strategy'
import transaction from './transaction'
import logger from '../../utils/logger'
import config from '../../config'
import sleep from '../../utils/sleep'
import { INIT, ORDERED, HOLD, CLOSED } from '../../const'
logger.init()
/**
 * トラップリピートイフダン
 * 取引所はbitflyer
 * @name trap
 * @constructor
 */
export default class trap {
    private strtgy: any
    private bfApi: any
    private cwApi: any
    private deals: any

    constructor() {
        this.strtgy = new strategy()
        this.cwApi = new cryptoWatch()
        this.deals = []
        for (let i = 0; i < config.trade.trap.quantity; i++) {
            let basePrice = config.trade.trap.basePrice - config.trade.trap.openRangePrice * i
            let openRangePrice = config.trade.trap.openRangePrice
            let closeRangePrice = config.trade.trap.closeRangePrice
            let lot = config.trade.trap.lot
            this.deals.push({
                id: i,
                transaction: new transaction(basePrice, openRangePrice, closeRangePrice, lot),
            })
        }

        const _apiKey = config.bitflyer.apiKey != undefined ? config.bitflyer.apiKey : ''
        const _secret = config.bitflyer.apiSecret != undefined ? config.bitflyer.apiSecret : ''
        this.bfApi = new bitflyer(_apiKey, _secret)
    }

    /**
     * イニシャライズ
     * @init
     * @return {Promise<void>}
     */
    public async init(): Promise<void> {
        this.trade()
    }

    /**
     * 取引情報を適時アップデート
     * @trade
     * @return {Promise<void>}
     */
    private async trade(): Promise<void> {
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                for (let i = 0; i < this.deals.length; i++) {
                    const trsct = this.deals[i].transaction
                    const prev = this.deals.find((item: any) => {
                        return item.id === i - 1
                    })

                    if (trsct.status === INIT) {
                        if (prev) {
                            if (prev.transaction.status === HOLD) {
                                trsct.open()
                            }
                        } else {
                            trsct.open()
                        }
                    }
                    if (trsct.status === ORDERED) {
                        if (prev) {
                            if (prev.transaction.status === CLOSED) {
                                trsct.cancel()
                            }
                        }
                    }
                    if (trsct.status === CLOSED) {
                        if (prev) {
                            if (prev.transaction.status === HOLD) {
                                trsct.open()
                            }
                        } else {
                            trsct.open()
                        }
                    }
                }
                await sleep.minutes(0.3)
            }


        } catch (err) {
            logger.LogSystemError(`【${this.constructor.name}】trade関数にエラーが発生しました。`)
            logger.LogSystemError(err)
        }
    }

    /**
     * 価格取得し情報を更新する
     * @update
     * @return {number}
     */
    private async getPrice(pair: string): Promise<number> {
        logger.LogSystemInfo('価格取得')
        const tick = await this.bfApi.getTicker(pair)
        if (!tick) {
            logger.LogAccessError(`【${this.constructor.name}】価格情報が取得出来ませんでした`)
            throw '価格情報が取得出来ませんでした'
        }
        logger.LogSystemInfo(`価格取得完了 価格:${tick.best_bid}`)

        return tick.best_bid
    }
}
