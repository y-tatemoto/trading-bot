import bitflyer from '../../api/bitflyer'
import cryptoWatch from '../../api/cryptoWatch'
import strategy from '../strategy'
import transaction from './transaction'
import logger from '../../utils/logger'
import config from '../../config'
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
    private basePrice: number
    private price: number | undefined
    private openRangePrice: number
    private closeRangePrice: number
    private pair: string
    private lot: number

    constructor() {
        this.strtgy = new strategy()
        this.cwApi = new cryptoWatch()
        this.pair = config.bitflyer.pair
        this.lot = config.trade.trap.lot
        this.basePrice = config.trade.trap.basePrice
        this.openRangePrice = config.trade.trap.openRangePrice
        this.closeRangePrice = config.trade.trap.closeRangePrice
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
        this.price = await this.getPrice()
        this.basePrice = this.basePrice < this.price ? this.basePrice : this.price
        const instruct = this.strtgy.trapRepeatIfdone(this.basePrice, this.openRangePrice, this.closeRangePrice)
        let t = new transaction(instruct.buy, instruct.sell, this.lot)
        t.open()
        let openTransactions = [t]
        let closeTransactions = []

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                this.price = await this.getPrice()
                closeTransactions = openTransactions.filter(item => {
                    return item.isClose()
                })
                openTransactions = openTransactions.filter(async item => {
                    if ((this.price as number) > item.openPrice + this.openRangePrice * 2 && item.isOrdered()) {
                        return !(await item.cancel())
                    } else {
                        return true
                    }
                })
                for (const item of openTransactions) {
                }
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
    private async getPrice(): Promise<number> {
        logger.LogSystemInfo('価格取得')
        const tick = await this.bfApi.getTicker(this.pair)
        if (!tick) {
            logger.LogAccessError(`【${this.constructor.name}】取引情報が取得出来ず注文が中断されました`)
            return this.price as number
        }
        logger.LogSystemInfo(`価格取得完了 価格:${tick.best_bid}`)

        return tick.best_bid
    }
}
