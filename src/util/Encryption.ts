import CryptoJS from 'crypto-js'
import { Keys } from '../enums/Keys'

export function encrypt (plainText: string, key: string = Keys.SERVER_SEND_TRANSFER_KEY): string {
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(
    plainText,
    CryptoJS.enc.Utf8.parse(key),
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  )
  const combined = iv.concat(encrypted.ciphertext)
  return CryptoJS.enc.Base64.stringify(combined)
}

export function decrypt (dataB64: string, key: string = Keys.SERVER_RECEIVE_TRANSFER_KEY): string {
  const data = CryptoJS.enc.Base64.parse(dataB64)
  const iv = CryptoJS.lib.WordArray.create(data.words.slice(0, 4), 16)
  const ciphertext = CryptoJS.lib.WordArray.create(
    data.words.slice(4),
    data.sigBytes - 16
  )
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext })

  const decrypted = CryptoJS.AES.decrypt(
    cipherParams,
    CryptoJS.enc.Utf8.parse(key),
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  )
  const result = decrypted.toString(CryptoJS.enc.Utf8)
  if (!result) throw new Error(encrypt('-997'))
  return result
}
