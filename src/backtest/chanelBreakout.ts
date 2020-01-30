import cryptoWatch from '../api/cryptoWatch'
import strategy from '../trader/strategy'
import config from '../config'
import logger from '../utils/logger'
import transaction from './transaction'
logger.init()

/**
 * ChanelBreakoutのバックテスト
 * @name chanelBreakout
 * @constructor
 */
export default class chanelBreakout {
    private cwApi: any
    private strtgy: any
    private position: number //0: ノーポジ, 1: ロング, 2: ショート
    private lot: number //取引するロット数
    private candleSize: number //ローソク足(分)
    private entryMonitoringPeriod: number //エントリー判定に使う足期間
    private closeMonitoringPeriod: number //クローズ判定に使う足期間
    private ohlc: any
    private allOhlc: any

    constructor() {
        this.position = 0
        this.lot = config.trade.turtle.lot
        this.candleSize = config.trade.turtle.candleSize
        this.entryMonitoringPeriod = config.trade.turtle.entry
        this.closeMonitoringPeriod = config.trade.turtle.close
        this.strtgy = new strategy()
        this.cwApi = new cryptoWatch()
        this.ohlc = []
    }

    /**
     * イニシャライズ
     * @init
     * @return {void}
     */
    public init(): void {
        this.testing()
    }

    /**
     * 取引判断情報を適時アップデート
     * シグナルを感知し取引を開始・終了させる
     * @trade
     * @return {Promise<boolean>}
     */
    private async testing(): Promise<boolean> {
        this.allOhlc = await this.cwApi.getOhlc(this.candleSize * 99999, this.candleSize)
        for (let index = 0; index < 8; index++) {
            this.update()
        }
        let transactions = []
        try {
            // eslint-disable-next-line no-constant-condition
            while (this.update()) {
                let t

                switch (this.getNextAction(this.position)) {
                    case 'NOPOS':
                        logger.LogSystemInfo('【trade】NOシグナル: NOPOS')
                        this.position = 0
                        break
                    case 'HOLD':
                        logger.LogSystemInfo('【trade】NOシグナル: HOLD')
                        break
                    case 'BUY':
                        logger.LogSystemInfo('【trade】シグナル点灯: BUY')

                        t = new transaction('BUY', this.lot)
                        t.open(this.ohlc[this.ohlc.length - 1][1])
                        transactions.push(t)
                        this.position = 1
                        break
                    case 'SELL':
                        logger.LogSystemInfo('【trade】シグナル点灯: SELL')
                        t = new transaction('SELL', this.lot)
                        t.open(this.ohlc[this.ohlc.length - 1][1])
                        transactions.push(t)
                        this.position = 2

                        break
                    case 'EXIT':
                        logger.LogSystemInfo('【trade】シグナル点灯: EXIT')
                        for (const item of transactions) {
                            if (item.status === 'HOLD') {
                                item.close(this.ohlc[this.ohlc.length - 1][1])
                                this.position = 0
                            }
                        }
                        break
                }
            }

            let total = 0
            for (const item of transactions) {
                let profit = item.getProfit()
                total += profit as number
                if (profit != false) {
                    logger.LogSystemInfo(`【損益】${profit}円`)
                }
            }
            logger.LogSystemInfo(`【最終損益】${total}円`)
        } catch (err) {
            logger.LogSystemError(`【${this.constructor.name}】trade関数にエラーが発生しました。`)
            logger.LogSystemError(err)
        }
        return true
    }

    /**
     * OHLCデータを更新する
     * @update
     * @return {void}
     */
    private update(): boolean {
        if (this.allOhlc.length === 0) return false
        this.ohlc.push(this.allOhlc.shift())
        return true
    }

    /**
     * 引数のポジションを元に次のアクションを判断する
     * @getNextAction
     * @return {void}
     */
    private getNextAction(pos: number): string {
        if (pos === 0) {
            switch (this.strtgy.chanelBreakout(this.entryMonitoringPeriod, this.ohlc)) {
                case 0:
                    return 'NOPOS'
                case 1:
                    return 'BUY'
                case 2:
                    return 'SELL'
            }
        } else if (pos === 1) {
            switch (this.strtgy.chanelBreakout(this.closeMonitoringPeriod, this.ohlc)) {
                case 0:
                    return 'HOLD'
                case 1:
                    return 'HOLD'
                case 2:
                    return 'EXIT'
            }
        } else if (pos === 2) {
            switch (this.strtgy.chanelBreakout(this.closeMonitoringPeriod, this.ohlc)) {
                case 0:
                    return 'HOLD'
                case 1:
                    return 'EXIT'
                case 2:
                    return 'HOLD'
            }
        }
        logger.LogSystemError('【getNextAction】予期しない数値を受け取りました')
        return ''
    }
}
