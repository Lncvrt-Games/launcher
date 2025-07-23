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
import { VersionsConfig } from '../types/VersionsConfig'
import { getKey } from './KeysHelper'

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
        await encrypt(
          JSON.stringify(new NormalConfig(version)),
          await getKey(2)
        )
      )
    )
    await file.close()
    return new NormalConfig(version)
  }
  const config = await readTextFile('config.dat', options)
  return NormalConfig.import(JSON.parse(await decrypt(config, await getKey(2))))
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
        await encrypt(JSON.stringify(data), await getKey(2))
      )
    )
    await file.close()
  } else {
    await writeFile(
      'config.dat',
      new TextEncoder().encode(
        await encrypt(JSON.stringify(data), await getKey(2))
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
        await encrypt(
          JSON.stringify(new VersionsConfig(version)),
          await getKey(3)
        )
      )
    )
    await file.close()
    return new VersionsConfig(version)
  }
  const config = await readTextFile('versions.dat', options)
  return VersionsConfig.import(
    JSON.parse(await decrypt(config, await getKey(3)))
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
        await encrypt(JSON.stringify(data), await getKey(3))
      )
    )
    await file.close()
  } else {
    await writeFile(
      'versions.dat',
      new TextEncoder().encode(
        await encrypt(JSON.stringify(data), await getKey(3))
      ),
      options
    )
  }
}
