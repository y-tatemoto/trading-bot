import log4js from 'log4js'
import config from '../config'

export default class Logger {
    public static init() {
        log4js.configure(config.log4js as log4js.Configuration)
    }

    public static LogAccessInfo(message: any): void {
        let logger = log4js.getLogger('access')
        logger.info(message)
    }

    public static LogAccessWarning(message: any): void {
        let logger = log4js.getLogger('access')
        logger.warn(message)
    }

    public static LogAccessError(message: any): void {
        let logger = log4js.getLogger('access')
        logger.error(message)
    }

    public static LogSystemInfo(message: any): void {
        let logger = log4js.getLogger('system')
        logger.info(message)
    }

    public static LogSystemWarning(message: any): void {
        let logger = log4js.getLogger('system')
        logger.warn(message)
    }

    public static LogSystemError(message: any): void {
        let logger = log4js.getLogger('system')
        logger.error(message)
    }

    public static LogError(message: any): void {
        let logger = log4js.getLogger('error')
        logger.error(message)
    }
}
