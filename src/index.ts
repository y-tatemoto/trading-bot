import turtle from './trader/turtle/turtle'
import trap from './trader/trap/trap'

function main() {
    //タートル手法BOT開始
    const trtl = new turtle()
    trtl.init()

    const trp = new trap()
    trp.init()
}
main()
