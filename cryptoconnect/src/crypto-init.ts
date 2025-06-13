import { randomBytes } from 'node:crypto';

// Initialize crypto before any other imports
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const bytes = randomBytes(array.length);
      array.set(bytes);
      return array;
    }
  } as any;
}

export {}; 