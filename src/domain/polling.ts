export function createPoller<T extends { status: string }>(
  load: (signal: AbortSignal) => Promise<T>,
  onValue: (value: T) => void,
  onError: (error: unknown) => void,
) {
  let active = false,
    epoch = 0,
    failures = 0,
    timer: ReturnType<typeof setTimeout> | undefined,
    controller: AbortController | undefined
  function stop() {
    active = false
    epoch++
    clearTimeout(timer)
    controller?.abort()
  }
  async function tick(generation: number) {
    controller = new AbortController()
    try {
      const result = await load(controller.signal)
      if (!active || generation !== epoch) return
      failures = 0
      onValue(result)
      if (['QUEUED', 'RUNNING'].includes(result.status))
        timer = setTimeout(() => tick(generation), 3000)
    } catch (error) {
      if (!active || generation !== epoch) return
      onError(error)
      const status = (error as { status?: number })?.status
      if ((status === 0 || status === undefined || status >= 500) && failures < 3) {
        const delay = [3000, 6000, 12000][failures++]!
        timer = setTimeout(() => tick(generation), delay)
      }
    }
  }
  function start() {
    stop()
    active = true
    failures = 0
    void tick(epoch)
  }
  return { start, stop }
}
