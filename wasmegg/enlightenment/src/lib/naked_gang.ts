// The naked gang is a group of crazies who insist on doing enlightenment
// diamond without artifacts.

import { sha256 } from 'js-sha256';

const gang: { [key: string]: string } = {
  '7e36583b390cbbd333f628299c92c051e82f1e915087506b63b76e75a15425cd': 'Zeiram',
};

export function nakedGangNickname(playerId: string): string | undefined {
  return gang[sha256(playerId)];
}
