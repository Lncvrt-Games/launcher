import { app } from '@tauri-apps/api'
import { NormalConfig } from '../types/NormalConfig'
import {
  BaseDirectory,
  create,
  exists,
  mkdir,
  readTextFile,
  writeFile
} from '@tauri-apps/plugin-fs'
import { decrypt, encrypt } from './Encryption'
import { Keys } from '../enums/Keys'

export async function readConfig (): Promise<NormalConfig> {
  const version = await app.getVersion()
  const options = {
    baseDir: BaseDirectory.AppLocalData
  }
  const doesFolderExist = await exists('', options)
  const doesConfigExist = await exists('config.dat', options)
  if (!doesFolderExist || !doesConfigExist) {
    if (!doesFolderExist) {
      await mkdir('', options)
    }
    const file = await create('config.dat', options)
    await file.write(
      new TextEncoder().encode(
        encrypt(
          JSON.stringify(new NormalConfig(version)),
          Keys.CONFIG_ENCRYPTION_KEY
        )
      )
    )
    await file.close()
    return new NormalConfig(version)
  }
  const config = await readTextFile('config.dat', options)
  return NormalConfig.import(
    JSON.parse(decrypt(config, Keys.CONFIG_ENCRYPTION_KEY))
  )
}

export async function writeConfig (data: NormalConfig) {
  const options = {
    baseDir: BaseDirectory.AppLocalData
  }
  const doesFolderExist = await exists('', options)
  const doesConfigExist = await exists('config.dat', options)
  if (!doesFolderExist || !doesConfigExist) {
    if (!doesFolderExist) {
      await mkdir('', options)
    }
    const file = await create('config.dat', options)
    await file.write(
      new TextEncoder().encode(
        encrypt(JSON.stringify(data), Keys.CONFIG_ENCRYPTION_KEY)
      )
    )
    await file.close()
  } else {
    await writeFile(
      'config.dat',
      new TextEncoder().encode(
        encrypt(JSON.stringify(data), Keys.CONFIG_ENCRYPTION_KEY)
      ),
      options
    )
  }
}
