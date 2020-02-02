import bitflyer from '../../api/bitflyer'
import logger from '../../utils/logger'
import config from '../../config'
import sleep from '../../utils/sleep'
logger.init()
/**
 * トラップリピートイフダン
 * 取引所はbitflyer
 * @name transaction
 * @constructor
 */
export default class Transaction {
    public openPrice: number
    public closePrice: number
    private pair: string //'BTC_JPY'
    private lot: number
    private type: string
    private counterType: string
    private orderIds: any
    private bfApi: any
    public status: string //'INIT' 初期状態, 'ORDERED' 処理中, 'HOLD' ポジション保持中, 'CLOSED' 決済済み

    constructor(openPrice: number, closePrice: number, lot: number, type: string = 'BUY') {
        this.openPrice = openPrice
        this.closePrice = closePrice
        this.lot = lot
        this.type = type
        this.counterType = this.type === 'BUY' ? 'SELL' : 'BUY'
        this.status = 'INIT'
        this.pair = config.bitflyer.pair

        const _apiKey = config.bitflyer.apiKey != undefined ? config.bitflyer.apiKey : ''
        const _secret = config.bitflyer.apiSecret != undefined ? config.bitflyer.apiSecret : ''
        this.bfApi = new bitflyer(_apiKey, _secret)
    }

    /**
     * - 発注・約定を担う関数
     * 処理中,処理後のステータスを切り替える
     * 取引所の状態を取得し正常なら発注
     * @order
     * @return {Promise<boolean>}
     */
    private async order(type: string, price: number, lot: number): Promise<boolean> {
        const canOrder = await this.canOrder()
        if (!canOrder) {
            logger.LogAccessError(`【${this.constructor.name}】取引所不調で注文が中断されました`)
            return false
        }

        const body = {
            product_code: this.pair, //注文するプロダクト
            child_order_type: 'LIMIT', //指値注文の場合は 'LIMIT', 成行注文の場合は 'MARKET'
            side: type, //買い注文の場合は 'BUY', 売り注文の場合は 'SELL' を指定します。
            price: price, //価格を指定します。
            size: lot, //注文数量を指定します。
            minute_to_expire: 525600, //期限切れまでの時間を分で指定します。
            time_in_force: 'GTC', //執行数量条件 を 'GTC', 'IOC', 'FOK' のいずれかで指定します。 https://lightning.bitflyer.com/docs/specialorder#%E5%9F%B7%E8%A1%8C%E6%95%B0%E9%87%8F%E6%9D%A1%E4%BB%B6
        }

        const result = await this.bfApi.sendChildorder(body)
        if (!result) {
            logger.LogAccessError(`【${this.constructor.name}】注文が通りませんでした`)
            return false
        }

        this.watchExecution(result.child_order_acceptance_id)
        this.orderIds.push(result.child_order_acceptance_id)

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
            logger.LogSystemError(`【${this.constructor.name}】${this.status}状態で取引開始しようとしています。`)
            return
        }

        try {
            while (!(await this.order(this.type, this.openPrice, this.lot))) await sleep.minutes(1)
        } catch (err) {
            logger.LogSystemError(`【${this.constructor.name}】取引開始時にエラーが発生しました。`)
            logger.LogSystemError(err)
        }

        this.status = 'ORDERED'
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
            logger.LogSystemError(
                `【${this.constructor.name}】${this.status}状態で取引クローズ注文しようとしています。`,
            )
            return
        }

        try {
            while (!(await this.order(this.counterType, this.closePrice, this.lot))) await sleep.minutes(1)
        } catch (err) {
            logger.LogSystemError(`【${this.constructor.name}】取引クローズ注文時にエラーが発生しました。`)
            logger.LogSystemError(err)
        }

        this.status = 'ORDERED'
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
     * - 約定を監視する
     * @watchExecution
     * @return {Promise<void>}
     */
    private async watchExecution(id: string): Promise<void> {
        let exec
        while (!(exec = await this.getExecution(id))) {
            if (exec.length) {
                if (this.status === 'ORDERED') {
                    this.status = 'HOLD'
                    this.close()
                } else if (this.status === 'HOLD') {
                    this.status = 'CLOSE'
                }
            }
            await sleep.minutes(1)
        }
    }

    /**
     * - 取引終了済み判断
     * @isClose
     * @return {boolean}
     */
    public isClose(): boolean {
        return this.status === 'CLOSE'
    }

    /**
     * - 取引開始済み判断
     * @isOrdered
     * @return {boolean}
     */
    public isOrdered(): boolean {
        return this.status === 'ORDERED'
    }

    /**
     * - 取引キャンセル処理
     * @cancel
     * @return {boolean}
     */
    public async cancel(): Promise<boolean> {
        for (const id of this.orderIds) {
            try {
                const body = {
                    product_code: this.pair,
                    child_order_acceptance_id: id,
                }
                const result = await this.bfApi.cancelChildorder(body)
                if (!result) return false
            } catch (err) {
                logger.LogSystemError(`【${this.constructor.name}】キャンセル時にエラーが発生しました。`)
                logger.LogSystemError(err)
            }
        }
        return true
    }
}
