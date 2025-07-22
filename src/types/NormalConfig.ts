import { SettingsType } from './SettingsType'

export class NormalConfig {
  constructor (
    public version: string,
    public settings: SettingsType = new SettingsType()
  ) {}

  static import (data: any) {
    const cfg = new NormalConfig(data.version)
    Object.assign(cfg.settings, data.settings)
    return cfg
  }
}
