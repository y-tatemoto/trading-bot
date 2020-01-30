import crypto from 'crypto'
import queryString from 'query-string'
import axios, { AxiosRequestConfig } from 'axios'
import logger from '../utils/logger'

/**
 * Bitflyerの各APIにリクエストするクラス
 * @name BitFlyer
 * @constructor
 * @param {String} apiKey APIキー
 * @param {String} apiSecret API秘密キー
 */
export default class BitFlyer {
    API_KEY: String
    API_SECRET: String
    BASE_URL: String

    constructor(apiKey: String, apiSecret: String) {
        this.API_KEY = apiKey
        this.API_SECRET = apiSecret
        this.BASE_URL = 'https://api.bitflyer.jp'
    }

    /**
     * 残高を取得する
     * @getBalances
     * @return {Promise<any>}
     */
    public async getBalances(): Promise<any> {
        let method = 'GET'
        let path = '/v1/me/getbalance'
        return await this.sendRequest(method, path, null)
    }

    /**
     * 新規注文を出す
     * @sendChildorder
     * @return {Promise<any>}
     */
    public async sendChildorder(body: any): Promise<any> {
        let method = 'POST'
        let path = '/v1/me/sendchildorder'
        return await this.sendRequest(method, path, body)
    }

    /**
     * 指定したIDの約定情報を取得
     * @getExecution
     * @param {string} pair //BTC_JPY
     * @param {string} child_order_acceptance_id //新規注文API の受付 ID
     * @return {Promise<any>}
     */
    public async getExecution(pair: string, child_order_acceptance_id: string): Promise<any> {
        let method = 'GET'
        let params = {
            product_code: pair,
            count: 1,
            child_order_acceptance_id: child_order_acceptance_id,
        }
        let path = '/v1/me/getexecutions?' + queryString.stringify(params)

        return await this.sendRequest(method, path, null)
    }

    private async sendRequest(method: string, path: string, body: any): Promise<any> {
        const ts = Date.now().toString()
        const uri = this.BASE_URL + path
        const secret = this.API_SECRET
        const apiKey = this.API_KEY
        let text = ts + method + path

        if (method === 'POST') text += JSON.stringify(body)
        const sign = crypto
            .createHmac('sha256', secret as crypto.BinaryLike)
            .update(text)
            .digest('hex')
        let options: AxiosRequestConfig = {
            url: uri,
            method: 'GET',
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-TIMESTAMP': ts,
                'ACCESS-SIGN': sign,
                'Content-Type': 'application/json',
            },
        }
        if (method === 'POST') {
            options.method = 'POST'
            options.data = body
        }
        return await axios(options)
            .then(res => {
                logger.LogAccessInfo(`【${this.constructor.name}】API通信が正常に処理されました。`)
                logger.LogAccessInfo(res.data)
                return res.data
            })
            .catch(err => {
                logger.LogAccessError(`【${this.constructor.name}】API通信にエラーが発生しました。`)
                logger.LogAccessError(err)
                return false
            })
    }

    /**
     * 取引所の稼動状態を取得する
     * @getHealth
     * @param {string} pair //BTC_JPY
     * @return {Promise<any>}
     */
    public async getHealth(pair: string): Promise<any> {
        let method = 'GET'
        let path = '/v1/gethealth'
        let params = { product_code: pair }
        return await this.sendPublicRequest(method, path, params)
    }

    /**
     * 板情報を取得する
     * @getHealth
     * @param {string} pair //BTC_JPY
     * @return {Promise<any>}
     */
    public async getBoard(pair: string): Promise<any> {
        let method = 'GET'
        let path = '/v1/board'
        let params = { product_code: pair }
        return await this.sendPublicRequest(method, path, params)
    }

    /**
     * 現在の市場情報を取得する
     * @getTicker
     * @param {string} pair //BTC_JPY
     * @return {Promise<any>}
     */
    public async getTicker(pair: string): Promise<any> {
        let method = 'GET'
        let path = '/v1/ticker'
        let params = { product_code: pair }
        return await this.sendPublicRequest(method, path, params)
    }

    private async sendPublicRequest(method: string, path: string, params: any): Promise<any> {
        const uri = this.BASE_URL + path

        let options: AxiosRequestConfig = {
            url: uri,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            params: params,
        }
        if (method === 'POST') options.method = 'POST'

        return await axios(options)
            .then(res => {
                logger.LogAccessInfo(`【${this.constructor.name}】API通信が正常に処理されました。`)
                logger.LogAccessInfo(res.data)
                return res.data
            })
            .catch(err => {
                logger.LogAccessError(`【${this.constructor.name}】API通信にエラーが発生しました。`)
                logger.LogAccessError(err)
                return false
            })
    }
}
