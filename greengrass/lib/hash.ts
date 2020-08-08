import crypto = require('crypto');

export function lazyHash(contents: string): string {
    const hash = crypto.createHash('sha265');
    hash.update(contents);
    return hash.digest('hex');
}