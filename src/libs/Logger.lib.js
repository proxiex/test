const httpContext = require('express-http-context'),
  pino = require('pino'),
  PinoPretty = require('pino-pretty');

const stream = process.env.NODE_ENV === 'local' ? PinoPretty({ colorize: true, singleLine: true }): null;

const logger = pino({
  messageKey: 'message',
  redact: ['*.verification', '*.*.new_password', '*.verification', '*.*.*.verification', '*.otp', '*.*.otp']
}, stream);

module.exports = class LoggerLib {
  static log(message, data, ...args) {
    const user = httpContext.get('user');
    logger.info({
      'name': process.env.APP_NAME,
      message,
      'request-id': httpContext.get('request-id'),
      user,
      data,
      args
    })
  }

  static error(err, data, ...args) {
    const user = httpContext.get('user');
    logger.error({
      'name': process.env.APP_NAME,
      err,
      'request-id': httpContext.get('request-id'),
      user,
      data,
      args
    })
  }
}
