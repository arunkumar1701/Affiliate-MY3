class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';
  const details =
    err.isOperational || process.env.NODE_ENV !== 'production' ? err.message : undefined;

  if (!err.isOperational) {
    console.error('[ERROR]', err);
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Unique constraint violation',
          code: 'UNIQUE_CONSTRAINT',
          field: err.meta?.target,
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { message: 'Record not found', code: 'NOT_FOUND' },
      });
    }
  }

  if (err.array && err.mapped) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: err.array(),
      },
    });
  }

  res.status(statusCode).json({
    success: false,
    error: { message, code, details, stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined },
  });
};

module.exports = { AppError, notFound, errorHandler };
