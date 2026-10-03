import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { safeRedirect, cost, percent, recordPath, createIdempotency } from '../src/domain/common'
import { request, ApiError, configureAuth } from '../src/api/client'
import { useAuthStore } from '../src/stores/auth'
const user = {
  principal_id: 'one',
  username: 'tester',
  display_name: 'Tester',
  permissions: ['audit'],
  employee_ids: ['*'],
  case_ids: null,
  review_period: null,
  source_types: [],
  evaluation_profiles: [],
  expires_at: null,
}
beforeEach(() => {
  sessionStorage.clear()
  setActivePinia(createPinia())
  configureAuth(
    () => '',
    () => {},
  )
  vi.unstubAllGlobals()
})
describe('safe navigation and display', () => {
  it('rejects external and encoded redirect tricks', () => {
    for (const path of [
      'https://evil.test',
      '//evil.test',
      '/\\evil.test',
      '/%2f%2fevil.test',
      '/login',
      '/missing',
    ])
      expect(safeRedirect(path)).toBe('/')
    expect(safeRedirect('/audits/abc?tab=evidence')).toBe('/audits/abc?tab=evidence')
    expect(recordPath('audit', 'a/b')).toBe('/audits/a%2Fb')
  })
  it('distinguishes zero, missing metrics and unknown cost', () => {
    expect(cost(null)).toBe('Unknown')
    expect(cost(0)).toBe('$0.00')
    expect(cost(1, 'UNKNOWN')).toBe('Unknown')
    expect(percent(null)).toBe('Not available')
    expect(percent(0)).toBe('0%')
  })
  it('reuses the key only for the same submission snapshot', () => {
    const get = createIdempotency()
    const first = get({ a: 1 })
    expect(get({ a: 1 })).toBe(first)
    expect(get({ a: 2 })).not.toBe(first)
  })
})
describe('API and authentication', () => {
  it('does not let a delayed old-session restore overwrite a new login', async () => {
    sessionStorage.setItem(
      'pea.session',
      JSON.stringify({ token: 'old-token', expiresAt: '2099-01-01', principalId: 'one' }),
    )
    let resolveOld!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveOld = resolve
            }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                access_token: 'new-token',
                expires_at: '2099-01-01',
                user: { ...user, principal_id: 'two', display_name: 'New user' },
              },
            }),
          ),
        ),
    )
    const auth = useAuthStore()
    configureAuth(
      () => auth.token,
      () => auth.clear(),
    )
    const restored = auth.restore().catch(() => {})
    await auth.login('new-user', 'password')
    resolveOld(new Response(JSON.stringify({ data: user })))
    await restored
    expect(auth.token).toBe('new-token')
    expect(auth.user?.principal_id).toBe('two')
    expect(auth.displayName).toBe('New user')
  })
  it('clears authentication even when an unauthorized response is not JSON', async () => {
    const expired = vi.fn()
    configureAuth(() => 'token', expired)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Unauthorized</html>', { status: 401 })),
    )
    await expect(request('/v1/audits/x')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toHaveBeenCalledOnce()
  })
  it('preserves passwords, validates refreshed sessions and clears recent data on logout', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: { access_token: 'test-token', expires_at: '2099-01-01', user },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 200, data: user })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 200, data: { logged_out: true } })),
      )
    vi.stubGlobal('fetch', fetcher)
    const auth = useAuthStore()
    await auth.login('tester', '  secret  ')
    expect(JSON.parse(fetcher.mock.calls[0][1].body).password).toBe('  secret  ')
    auth.remember('audit', 'a1')
    expect(auth.recent).toHaveLength(1)
    auth.verified = false
    await auth.restore()
    expect(fetcher.mock.calls[1][0]).toContain('/v1/auth/me')
    await auth.logout()
    expect(auth.user).toBeNull()
    expect(auth.recent).toHaveLength(0)
    expect(sessionStorage.getItem('pea.session')).toBeNull()
  })
  it('retains session for forbidden responses and clears it for unauthorized responses', async () => {
    const expired = vi.fn()
    configureAuth(() => 'token', expired)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { error_code: 'FORBIDDEN' } }), { status: 403 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { error_code: 'INVALID_TOKEN' } }), { status: 401 }),
        ),
    )
    await expect(request('/v1/audits/x')).rejects.toMatchObject({ status: 403 })
    expect(expired).not.toHaveBeenCalled()
    await expect(request('/v1/audits/x')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toHaveBeenCalledOnce()
  })
  it('reports non-JSON responses as connection errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>proxy error</html>', { status: 502 })),
    )
    await expect(request('/v1/audits/x')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})
