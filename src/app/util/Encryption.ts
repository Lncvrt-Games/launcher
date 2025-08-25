import CryptoJS from 'crypto-js'
import { getKey } from './KeysHelper'

export async function encrypt (
  plainText: string,
  key?: string
): Promise<string> {
  if (!key) key = await getKey(1)
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

export async function decrypt (dataB64: string, key?: string): Promise<string> {
  if (!key) key = await getKey(0)
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
  if (!result) throw new Error(await encrypt('-997'))
  return result
}
