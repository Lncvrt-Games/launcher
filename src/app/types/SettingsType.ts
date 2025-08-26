export class SettingsType {
  constructor (
    public checkForNewVersionOnLoad: boolean = true,
    public allowNotifications: boolean = true,
    public useWineOnUnixWhenNeeded: boolean = false,
    public wineOnUnixCommand: string = 'wine %path%',
    public useWindowsRoundedCorners: boolean = false
  ) {}
}
