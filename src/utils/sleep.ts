/**
 * スリープ処理クラス
 * @name Sleep
 */
export default class Sleep {
    /**
     * {time}ミリ秒 スリープ処理
     * @getOhlc
     * @param {number} time
     * @return {Promise<any>}
     */
    public static milliSeconds(time: number): Promise<any> {
        return new Promise(resolve => setTimeout(resolve, time))
    }

    /**
     * {time}秒
     * @getOhlc
     * @param {number} time
     * @return {Promise<any>}
     */
    public static seconds(time: number): Promise<any> {
        return this.milliSeconds(time * 1000)
    }

    /**
     * {time}分
     * @getOhlc
     * @param {number} time
     * @return {Promise<any>}
     */
    public static minutes(time: number): Promise<any> {
        return this.milliSeconds(time * 1000 * 60)
    }

    /**
     * {time}時間
     * @getOhlc
     * @param {number} time
     * @return {Promise<any>}
     */
    public static hours(time: number): Promise<any> {
        return this.milliSeconds(time * 1000 * 60 * 60)
    }
}
