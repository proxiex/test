var HttpStatusCode = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER: 500,
};

function ErrorLib(name, code, description) {
  Error.call(this, name);
  this.code = code;
  this.description = description;
}

ErrorLib.prototype = Object.create(Error.prototype);
ErrorLib.prototype.constructor = ErrorLib;

function NotFound(name, description) {
  if (name === undefined) name = '';
  if (description === undefined) description = 'not found';
  ErrorLib.call(this, name, HttpStatusCode.NOT_FOUND, description);
}

NotFound.prototype = Object.create(ErrorLib.prototype);
NotFound.prototype.constructor = NotFound;

function BadRequest(name, description) {
  if (name === undefined) name = '';
  if (description === undefined) description = 'bad request';
  ErrorLib.call(this, name, HttpStatusCode.BAD_REQUEST, description);
}

BadRequest.prototype = Object.create(ErrorLib.prototype);
BadRequest.prototype.constructor = BadRequest;

function ServerError(name, description) {
  if (name === undefined) name = '';
  if (description === undefined) description = 'server error';
  ErrorLib.call(this, name, HttpStatusCode.INTERNAL_SERVER, description);
}

ServerError.prototype = Object.create(ErrorLib.prototype);
ServerError.prototype.constructor = ServerError;

// Exporting the constructors
module.exports = {
  ErrorLib: ErrorLib,
  NotFound: NotFound,
  BadRequest: BadRequest,
  ServerError: ServerError
};
