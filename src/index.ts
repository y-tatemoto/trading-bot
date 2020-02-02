import turtle from './trader/turtle/turtle'
import strategy from './trader/strategy'

function main() {
    //タートル手法BOT開始
    const trtl = new turtle()
    trtl.init()

    const strtg = new strategy()
    //console.log(strtg.trapRepeatIfdone(1000000, 30000, 15000))
}
main()
