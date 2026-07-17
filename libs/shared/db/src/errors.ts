export class AppError extends Error {
  constructor(public readonly message: string, public readonly status: 400 | 403 | 404 | 409 | 422 | 500 = 400) {
    super(message);
    this.name = 'AppError';
  }
}
