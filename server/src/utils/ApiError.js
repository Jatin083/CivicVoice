class ApiError extends Error {
  constructor(status, message, code = undefined, extra = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra; // e.g. { allowed: [...] } for a bad status transition
  }
}
module.exports = ApiError;
