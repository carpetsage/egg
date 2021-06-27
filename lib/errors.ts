export class UserBackupEmptyError extends Error {
  constructor(userId: string) {
    let message = `${userId}: backup is empty`;
    if (!userId.match(/^EI\d{16}$/)) {
      message +=
        ` (ID is not in the form 'EI1234567890123456'; ` +
        `please make sure the ID is uppercase 'EI' followed by 16 digits)`;
    } else {
      message += ` (please make sure the ID is correct and current)`;
    }
    super(message);
    this.name = 'UserBackupEmptyError';
  }
}
