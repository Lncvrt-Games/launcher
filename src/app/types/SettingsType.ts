export class SettingsType {
  constructor(
    public allowNotifications: boolean = true,
    public useWineOnUnixWhenNeeded: boolean = false,
    public wineOnUnixCommand: string = 'wine %path%'
  ) { }
}
