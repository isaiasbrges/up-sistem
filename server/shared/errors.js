'use strict';
class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message); this.status=status; this.code=code; this.fields=fields;
  }
}
const fail = (status,code,message,fields) => { throw new AppError(status,code,message,fields); };
module.exports = {AppError,fail};
