/**
 * トレード判断関数をまとめたクラス
 * @name Strategy
 * @constructor
 */
export default class Strategy {
    constructor() {}

    /**
     * - チャネルブレイクアウト戦略
     * 期間{term}内のローソク足{candles}の最高値(最安値)と
     * 最新確定済みのローソク足を比較し最高値(最安値)を超えてたら'BUY<1>'('SELL<2>')を返し
     * 超えてなければ'HOLD'<0>を返す
     * @param term {number} 期間
     * @param candles {any} ローソク足データ
     * [
     *     [CloseTime, OpenPrice, HighPrice, LowPrice, ClosePrice, Volume, QuoteVolume],
     *     ... 400 more items
     * ]
     * @return {number} //0: HOLD, 1: BUY, 2: SELL
     */
    public chanelBreakout(term: number, candles: any): Number {
        let judgCandles = candles.slice((term + 2) * -1) //termで設定されたローソク足を切り出す
        judgCandles.pop() //未確定のローソク足を排除
        const latestCandle = judgCandles.pop() //判定基準ローソク足を切り出す
        let high: number = judgCandles[0][2]
        let low: number = judgCandles[0][3]
        let signal: number = 0 //0: HOLD, 1: BUY, 2: SELL

        for (const candle of judgCandles) {
            let closePrice = candle[4]
            if (closePrice > high) high = closePrice
            if (closePrice < low) low = closePrice
        }

        if (latestCandle[4] > high) signal = 1
        else if (latestCandle[4] < low) signal = 2
        else signal = 0

        return signal
    }

    //トラップリピートイフダン(買い専)
    public trapRepeatIfdone(
        basePrice: number,
        openRangePrice: number,
        closeRangePrice: number,
        side: string = 'BUY',
    ): any {
        if (side === 'BUY') {
            openRangePrice *= -1
            closeRangePrice *= -1
        }
        return { buy: basePrice + openRangePrice, sell: basePrice + closeRangePrice }
    }
}
