import config from '../../config'
import logger from '../../utils/logger'

/**
 * 売買を管理するクラス
 * @name transaction
 * @param {String} type 'BUY','SELL'
 * @param {Number} lot 枚数
 * @constructor
 */
export default class transaction {
    type: string //'BUY' or 'SELL'
    counterType: string //取引クローズの再のtype 'BUY' or 'SELL'
    lot: number //注文ロット数
    pair: string //'BTC_JPY'
    status: string //'INIT' 初期状態, 'COMFIRM' 処理中, 'HOLD' ポジション保持中, 'CLOSED' 決済済み
    data: any

    constructor(type: string, lot: number) {
        this.type = type
        this.counterType = this.type === 'BUY' ? 'SELL' : 'BUY'
        this.lot = lot
        this.pair = config.bitflyer.pair
        this.status = 'INIT'
        this.data = {}
    }

    /**
     * - 発注・約定を担う関数
     * 処理中,処理後のステータスを切り替える
     * 取引所の状態を取得し正常なら発注
     * 発注した注文状態を取得し約定していなければ約定するまで繰り返し処理を行う
     * !注意：呼び出し側は約定したかどうかは判断出来ない
     * @order
     * @return {boolean}
     */
    private order(type: string, lot: number = this.lot, price: number): boolean {
        if (type === 'BUY') {
            this.data.BUY = { price: price, lot: lot }
        } else {
            this.data.SELL = { price: price, lot: lot }
        }

        if (this.status === 'INIT') this.status = 'HOLD'
        else if (this.status === 'HOLD') this.status = 'CLOSE'

        return true
    }

    /**
     * - 売買を開始する関数
     * 取引未開始なら発注する
     * 発注が通るまで繰り返し行う
     * @open
     * @return {void}
     */
    public open(price: number): void {
        if (this.status != 'INIT') {
            logger.LogSystemError(`【${this.constructor.name}】${this.status}状態で取引オープンしようとしています。`)
            return
        }

        this.order(this.type, this.lot, price)
    }

    /**
     * - 反対売買を開始する関数
     * 取引開始済なら発注する
     * 発注が通るまで繰り返し行う
     * @close
     * @return {void}
     */
    public close(price: number): void {
        if (this.status != 'HOLD') {
            logger.LogSystemError(`【${this.constructor.name}】${this.status}状態で取引クローズしようとしています。`)
            return
        }

        this.order(this.counterType, this.lot, price)
    }

    /**
     * - 取引の損益を取得する関数
     * 反対売買済なら取引情報を取得する
     * 損益を返す
     * @getProfit
     * @return {number | boolean}
     */
    public getProfit(): number | boolean {
        if (this.status != 'CLOSE') {
            return false
        }

        let openPrice = 0
        let closePrice = 0
        if (this.type === 'BUY') {
            openPrice = this.data.BUY.price * this.data.BUY.lot
            closePrice = this.data.SELL.price * this.data.SELL.lot
        } else {
            openPrice = this.data.SELL.price * this.data.SELL.lot
            closePrice = this.data.BUY.price * this.data.BUY.lot
        }

        return this.type === 'BUY' ? closePrice - openPrice : openPrice - closePrice
    }
}
