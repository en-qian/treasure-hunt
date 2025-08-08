import { ERROR_CODE } from '@constants';
import * as v from './validators';
import { Request, Response, NextFunction } from 'express';

export type SuccessStatusCode = 200 | 201 | 204;

type ERROR_CODE = keyof typeof ERROR_CODE;
type ERROR_STATUS_CODE = (typeof ERROR_CODE)[ERROR_CODE];

type ErrorConstructorObject = {
  errorCode: ERROR_CODE;
  message?: string;
  fields?: Record<string, any>[];
  statusCode?: ERROR_STATUS_CODE;
};

export class ErrorResponse extends Error {
  public errorCode: ERROR_CODE;
  public statusCode: ERROR_STATUS_CODE;
  public statusId?: 0 | 1 | 2;

  /**
   * @param error Error object or error code of current error
   * @param message Message to be shown on client end
   * @param fields Error Fields
   * @param statusCode Override the default status code responding to `errorCode`
   */
  constructor(
    error: ERROR_CODE | ErrorConstructorObject,
    message?: string,
    statusId?: 0 | 1 | 2,
    statusCode?: ERROR_STATUS_CODE
  ) {
    super();

    if (v.isString(error)) {
      this.errorCode = error;
      this.statusCode = statusCode ?? ERROR_CODE[error];
      this.statusId = statusId || 0;
      this.message = message || '';
    } else {
      this.errorCode = error.errorCode;
      this.statusCode = error.statusCode ?? ERROR_CODE[error.errorCode];
      this.statusId = statusId || 0;
      this.message = error.message || '';
    }
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default values if properties are missing
  const statusCode = err.statusCode || 500;
  const errorType = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  console.log({
    error: errorType,
    message: message,
  });

  res.status(statusCode).json({
    error: errorType,
    message: message,
  });
};
