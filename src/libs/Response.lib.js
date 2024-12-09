import LoggerLib from './Logger.lib';
import httpContext from 'express-http-context';

export default class ResponseLib {
  constructor(_req, _res) {
    this._req = _req;
    this._res = _res; 
   }

  status(statuscode) {
    this._res.status(statuscode);
    return this;
  }

  json(data) {
    this._res.statusCode = this._res.statusCode ?? 200;
    LoggerLib.log('API Response:', {
      url: this._req.url,
      method: this._req.method,
      status: this._res.statusCode,
      response: data
    });
    this._res.set('X-Request-ID', httpContext.get('request-id'))
    this._res.json(data);
    return this;
  }

  setHeader(data) {
    for (const key in data) {
      this._res.set(key, data[key])
    }
    return this
  }
}
