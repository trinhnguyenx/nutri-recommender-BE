export enum ResponseStatus {
  Success,
  Failed,
}
export class ServiceResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
  code: number;

  constructor(status: ResponseStatus, message: string, data: T, code: number) {
    this.success = status === ResponseStatus.Success;
    this.message = message;
    this.data = data;
    this.code = code;
  }
}
