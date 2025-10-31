export class DownloadProgress {
  constructor(
    public version: string,
    public progress: number,
    public failed: boolean,
    public queued: boolean
  ) { }
}
