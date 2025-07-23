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
import { VersionsConfig } from '../types/VersionsConfig'

export async function readNormalConfig (): Promise<NormalConfig> {
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

export async function writeNormalConfig (data: NormalConfig) {
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

export async function readVersionsConfig (): Promise<VersionsConfig> {
  const version = await app.getVersion()
  const options = {
    baseDir: BaseDirectory.AppLocalData
  }
  const doesFolderExist = await exists('', options)
  const doesConfigExist = await exists('versions.dat', options)
  if (!doesFolderExist || !doesConfigExist) {
    if (!doesFolderExist) {
      await mkdir('', options)
    }
    const file = await create('versions.dat', options)
    await file.write(
      new TextEncoder().encode(
        encrypt(
          JSON.stringify(new VersionsConfig(version)),
          Keys.VERSIONS_ENCRYPTION_KEY
        )
      )
    )
    await file.close()
    return new VersionsConfig(version)
  }
  const config = await readTextFile('versions.dat', options)
  return VersionsConfig.import(
    JSON.parse(decrypt(config, Keys.VERSIONS_ENCRYPTION_KEY))
  )
}

export async function writeVersionsConfig (data: VersionsConfig) {
  const options = {
    baseDir: BaseDirectory.AppLocalData
  }
  const doesFolderExist = await exists('', options)
  const doesConfigExist = await exists('versions.dat', options)
  if (!doesFolderExist || !doesConfigExist) {
    if (!doesFolderExist) {
      await mkdir('', options)
    }
    const file = await create('versions.dat', options)
    await file.write(
      new TextEncoder().encode(
        encrypt(JSON.stringify(data), Keys.VERSIONS_ENCRYPTION_KEY)
      )
    )
    await file.close()
  } else {
    await writeFile(
      'versions.dat',
      new TextEncoder().encode(
        encrypt(JSON.stringify(data), Keys.VERSIONS_ENCRYPTION_KEY)
      ),
      options
    )
  }
}
