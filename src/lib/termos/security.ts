import crypto from 'crypto'

const TOKEN_BYTES = 32

export function generateSignatureToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

export function hashSignatureToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
