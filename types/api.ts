export type ApiValidationDetail = {
  path: string;
  message: string;
  code?: string;
};

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    message: string;
    details?: ApiValidationDetail[] | unknown;
  };
};
