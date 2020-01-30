import axios, { AxiosRequestConfig } from 'axios'
import moment from 'moment'
import logger from '../utils/logger'

/**
 * cryptoWatchのAPIにリクエストするクラス
 * @name CryptoWatch
 * @constructor
 * @param {String} market 参照する取引所
 * @param {String} pair 参照する取引ペア
 */
export default class CryptoWatch {
    BASE_URL: String

    constructor(market: String = 'bitflyer', pair: String = 'btcjpy') {
        this.BASE_URL = `https://api.cryptowat.ch/markets/${market}/${pair}`
    }

    /**
     * 現在価格を取得する
     * @getPrice
     * @return {Promise<any>}
     */
    public async getPrice(): Promise<any> {
        let method = 'GET'
        let path = '/price'
        let res = await this.sendRequest(method, path)
        return res ? res.result.price : false
    }

    /**
     * ローソク足データを取得する
     * @getOhlc
     * @param {Number} after ( minutes ) n分前からのデータを取得
     * @param {Number} periods ( minutes ) ローソク足の間隔 --- example 60 | 1分, 14400 | 4時間
     * @return {Promise<any>}
     */
    public async getOhlc(after: number, periods: number): Promise<any> {
        const unix = moment().unix()
        const aftr = unix - after * 60
        const prds = periods * 60
        let params = {
            after: aftr,
            periods: prds,
        }

        const method = 'GET'
        const path = '/ohlc'

        const res = await this.sendRequest(method, path, params)
        return res ? res.result[prds] : false
    }

    private async sendRequest(method: string, path: string, params: any = null): Promise<any> {
        const uri = this.BASE_URL + path

        let options: AxiosRequestConfig = {
            url: uri,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
        if (method === 'POST') options.method = 'POST'
        if (params) options.params = params

        return await axios(options)
            .then(res => {
                logger.LogAccessInfo(`【${this.constructor.name}】API通信が正常に処理されました。`)
                //logger.LogAccessInfo(res.data)
                return res.data
            })
            .catch(err => {
                logger.LogAccessError(`【${this.constructor.name}】API通信にエラーが発生しました。`)
                logger.LogAccessError(err)
                return false
            })
    }
}
