import bitflyer from '../api/bitflyer'
import config from '../config'
import logger from '../utils/logger'
import sleep from '../utils/sleep'

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
    slide: number //取引価格をスライドさせる
    bfApi: any
    orderIds: any //発注IDを保持する JRF20200129-080958-007488
    status: string //'INIT' 初期状態, 'COMFIRM' 処理中, 'HOLD' ポジション保持中, 'CLOSED' 決済済み

    constructor(type: string, lot: number) {
        this.type = type
        this.counterType = this.type === 'BUY' ? 'SELL' : 'BUY'
        this.lot = lot
        this.pair = config.bitflyer.pair
        this.slide = 100
        this.status = 'INIT'
        this.orderIds = []

        const _apiKey = config.bitflyer.apiKey != undefined ? config.bitflyer.apiKey : ''
        const _secret = config.bitflyer.apiSecret != undefined ? config.bitflyer.apiSecret : ''
        this.bfApi = new bitflyer(_apiKey, _secret)
    }

    /**
     * - 発注・約定を担う関数
     * 処理中,処理後のステータスを切り替える
     * 取引所の状態を取得し正常なら発注
     * 発注した注文状態を取得し約定していなければ約定するまで繰り返し処理を行う
     * !注意：呼び出し側は約定したかどうかは判断出来ない
     * @order
     * @return {Promise<boolean>}
     */
    private async order(type: string, lot: number = this.lot): Promise<boolean> {
        const status = this.status
        this.status = 'COMFIRM'
        const canOrder = await this.canOrder()
        if (!canOrder) {
            logger.LogAccessError(`【${this.constructor.name}】取引所不調で注文が中断されました`)
            return false
        }

        const tick = await this.bfApi.getTicker(this.pair)
        if (!tick) {
            logger.LogAccessError(`【${this.constructor.name}】取引情報が取得出来ず注文が中断されました`)
            return false
        }

        const price = type === 'BUY' ? tick.best_bid + this.slide : tick.best_ask - this.slide

        const body = {
            product_code: this.pair, //注文するプロダクト
            child_order_type: 'LIMIT', //指値注文の場合は 'LIMIT', 成行注文の場合は 'MARKET'
            side: type, //買い注文の場合は 'BUY', 売り注文の場合は 'SELL' を指定します。
            price: price, //価格を指定します。
            size: lot, //注文数量を指定します。
            minute_to_expire: 1, //期限切れまでの時間を分で指定します。
            time_in_force: 'GTC', //執行数量条件 を 'GTC', 'IOC', 'FOK' のいずれかで指定します。 https://lightning.bitflyer.com/docs/specialorder#%E5%9F%B7%E8%A1%8C%E6%95%B0%E9%87%8F%E6%9D%A1%E4%BB%B6
        }

        const result = await this.bfApi.sendChildorder(body)
        if (!result) {
            logger.LogAccessError(`【${this.constructor.name}】注文が通りませんでした`)
            return false
        }

        const orderId = result.child_order_acceptance_id

        //!!!! ここで約定したかどうか確認、1分以内に約定してなければ注文を繰り返す !!!!//
        sleep.minutes(1).then(async () => {
            const exec = await this.getExecution(orderId)
            if (exec) {
                this.orderIds.push(orderId)
                if (status === 'INIT') this.status = 'HOLD'
                if (status === 'HOLD') this.status = 'CLOSE'
            } else {
                this.status = status
                this.order(type, lot)
            }
        })

        //注文は通ったが約定したかどうかは不明状態
        return true
    }

    /**
     * - 売買を開始する関数
     * 取引未開始なら発注する
     * 発注が通るまで繰り返し行う
     * @open
     * @return {Promise<void>}
     */
    public async open(): Promise<void> {
        if (this.status != 'INIT') {
            logger.LogSystemError(`【${this.constructor.name}】${this.status}状態で取引オープンしようとしています。`)
            return
        }

        try {
            while (!(await this.order(this.type))) await sleep.minutes(1)
        } catch (err) {
            logger.LogSystemError(`【${this.constructor.name}】取引オープン時にエラーが発生しました。`)
            logger.LogSystemError(err)
        }
    }

    /**
     * - 反対売買を開始する関数
     * 取引開始済なら発注する
     * 発注が通るまで繰り返し行う
     * @close
     * @return {Promise<void>}
     */
    public async close(): Promise<void> {
        if (this.status != 'HOLD') {
            logger.LogSystemError(`【${this.constructor.name}】${this.status}状態で取引クローズしようとしています。`)
            return
        }

        try {
            while (!(await this.order(this.counterType))) await sleep.minutes(1)
        } catch (err) {
            logger.LogSystemError(`【${this.constructor.name}】取引クローズ時にエラーが発生しました。`)
            logger.LogSystemError(err)
        }
    }

    /**
     * - 取引の損益を取得する関数
     * 反対売買済なら取引情報を取得する
     * 損益を返す
     * @getProfit
     * @return {Promise<any>}
     */
    public async getProfit(): Promise<any> {
        if (this.status != 'CLOSE') {
            return false
        }
        let openPrice = 0
        let closePrice = 0
        for (const id of this.orderIds) {
            let result = await this.getExecution(id)
            /*
                {
                    "id": 1547864197,
                    "side": "BUY",
                    "price": 982450,
                    "size": 0.001,
                    "exec_date": "2020-01-28T15:33:43.853",
                    "child_order_id": "JOR20200128-153343-361602",
                    "commission": 0.0000011,
                    "child_order_acceptance_id": "JRF20200128-153343-847779"
                }
            */
            if (!result) {
                logger.LogAccessError(`【${this.constructor.name}】約定情報が取得できませんでした`)
                return false
            }
            if (result.side === this.type) openPrice = result.price
            if (result.side === this.counterType) closePrice = result.price
        }
        return openPrice - closePrice
    }

    /**
     * - 引数のIDの約定履歴を取得する関数
     * 約定情報を取得
     * 整形し返す
     * @getExecution
     * @return {Promise<any>}
     */
    private async getExecution(id: string): Promise<any> {
        let result = await this.bfApi.getExecution(this.pair, id)
        if (!result) return false
        if (!result.length) return false
        console.log(result)
        return result[0]
    }

    /**
     * - 発注可能な状態か判断する関数
     * @canOrder
     * @return {Promise<boolean>}
     */
    private async canOrder(): Promise<boolean> {
        const result = await this.bfApi.getHealth(this.pair)
        if (result === false) {
            return false
        } else if (result.status === 'NO ORDER' || result.status === 'STOP') {
            return false
        }

        return true
    }
}
