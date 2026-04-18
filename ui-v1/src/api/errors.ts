export class AuthenticationError extends Error {
  constructor(message: string = 'Session expired or unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
  }
}
