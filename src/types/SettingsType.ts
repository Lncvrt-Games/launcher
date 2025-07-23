export class SettingsType {
  constructor (
    public checkForNewVersionOnLoad: boolean = true,
    public allowNotifications: boolean = true,
    public useWineOnUnixWhenNeeded: boolean = false,
  ) {}
}
