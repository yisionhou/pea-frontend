import { afterEach, expect, it, vi } from 'vitest'
import { createPoller } from '../src/domain/polling'
afterEach(() => vi.useRealTimers())
it('polls serially and stops at a terminal state', async () => {
  vi.useFakeTimers()
  const load = vi
    .fn()
    .mockResolvedValueOnce({ status: 'RUNNING' })
    .mockResolvedValue({ status: 'SUCCEEDED' })
  const poll = createPoller(
    load,
    () => {},
    () => {},
  )
  poll.start()
  await vi.advanceTimersByTimeAsync(3000)
  expect(load).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(30000)
  expect(load).toHaveBeenCalledTimes(2)
  poll.stop()
})
it('stops after three network retries and cancels in-flight results', async () => {
  vi.useFakeTimers()
  const fail = vi.fn().mockRejectedValue({ status: 0 })
  const error = vi.fn()
  const poll = createPoller(fail, () => {}, error)
  poll.start()
  await vi.advanceTimersByTimeAsync(50000)
  expect(fail).toHaveBeenCalledTimes(4)
  expect(error).toHaveBeenCalled()
  poll.stop()
  let resolve!: (v: any) => void
  const value = vi.fn()
  const late = createPoller(
    () => new Promise((r) => (resolve = r)),
    value,
    () => {},
  )
  late.start()
  late.stop()
  resolve({ status: 'SUCCEEDED' })
  await Promise.resolve()
  expect(value).not.toHaveBeenCalled()
})
