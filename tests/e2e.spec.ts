import { test, expect } from '@playwright/test'
import { user, audit, followup, evaluation } from './fixtures'
import { loadEnv } from 'vite'
test.beforeEach(async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const data = path.endsWith('/auth/login')
      ? { access_token: 'fixture-token', expires_at: '2099-01-01', user }
      : path.endsWith('/auth/me')
        ? user
        : path.endsWith('/auth/logout')
          ? { logged_out: true }
          : path === '/v1/audits'
            ? audit
            : path === '/v1/reviews'
              ? { review_id: 'review1' }
              : path.includes('/follow-ups')
                ? followup
                : path.includes('/evaluations/')
                  ? evaluation
                  : audit
    await route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
})
async function login(page: any) {
  await page.goto('/login')
  await page.getByLabel('Username', { exact: true }).fill('reviewer')
  await page.getByLabel('Password', { exact: true }).fill(' password ')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible()
}

test('Claude model choice submits the OpenRouter profile', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Create audit' }).click()
  await page.getByLabel('Case ID', { exact: true }).fill('claude_test')
  await page.getByLabel('Employee ID', { exact: true }).fill('E001')
  await page.getByLabel('Audit criterion').fill('Sales target achievement')
  await page.getByLabel('Claim', { exact: true }).fill('Exceeded target')
  await page.getByText('Model-based', { exact: true }).click()
  await page.getByLabel('Model profile', { exact: true }).press('Enter')
  await page.getByRole('option', { name: 'Claude Sonnet 5', exact: true }).click()
  const post = page.waitForRequest((r) => r.url().endsWith('/v1/audits') && r.method() === 'POST')
  await page.getByRole('button', { name: 'Submit audit' }).click()
  expect((await post).postDataJSON()).toMatchObject({ mode: 'llm', model_profile: 'claude' })
  await expect(page.getByRole('heading', { name: 'Audit Details' })).toBeVisible()
})
test('login, empty workspace, audit creation, review and logout', async ({ page }) => {
  await login(page)
  await expect(page.getByText('No records viewed yet')).toBeVisible()
  await page.getByRole('button', { name: 'Create audit' }).click()
  await page.getByLabel('Case ID', { exact: true }).fill('case_test')
  await page.getByLabel('Employee ID', { exact: true }).fill('E001')
  await page.getByLabel('Audit criterion').fill('Sales target achievement')
  await page.getByLabel('Claim', { exact: true }).fill('Exceeded target')
  const post = page.waitForRequest((r) => r.url().endsWith('/v1/audits') && r.method() === 'POST')
  await page.getByRole('button', { name: 'Submit audit' }).click()
  expect((await post).postDataJSON().case.evidence).toEqual([])
  await expect(page.getByRole('heading', { name: 'Audit Details' })).toBeVisible()
  await page.getByLabel('Rationale', { exact: true }).fill('Please supply the official target.')
  const review = page.waitForRequest((r) => r.url().endsWith('/v1/reviews'))
  await page.getByRole('button', { name: 'Submit review' }).click()
  expect((await review).postDataJSON().final_label).toBeNull()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('pea.session'))).toBeNull()
})
test('seven page layouts, missing followup evidence, partial metrics, mobile', async ({ page }) => {
  await page.goto('/login')
  await page.screenshot({ path: 'test-results/screenshots/01-login.png', fullPage: true })
  await login(page)
  await page.screenshot({ path: 'test-results/screenshots/02-workspace.png', fullPage: true })
  for (const [path, heading, name] of [
    ['/audits/new', 'New Audit', '03-new-audit'],
    ['/audits/audit_test', 'Audit Details', '04-audit-detail'],
    ['/follow-ups/agent_test', 'Evidence Follow-up', '05-followup-detail'],
    ['/evaluations/new', 'New Evaluation', '06-new-evaluation'],
    ['/evaluations/exp_test', 'Evaluation Report', '07-evaluation-report'],
  ]) {
    await page.goto(path!)
    await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
    await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true })
    if (path === '/follow-ups/agent_test') {
      await expect(page.getByText('Evidence text is not available.')).toBeVisible()
      await expect(page.getByText('No re-audit result')).toBeVisible()
    }
    if (path === '/evaluations/new') {
      const enabled = loadEnv('production', process.cwd(), 'VITE_').VITE_ENABLE_EVALUATION_SUBMIT === 'true'
      if (enabled) await expect(page.getByRole('button', { name: 'Start evaluation' })).toBeEnabled()
      else await expect(page.getByRole('button', { name: 'Start evaluation' })).toBeDisabled()
    }
  }
  await expect(page.getByText('1 / 6 tasks completed')).toBeVisible()
  await page.getByRole('tab', { name: 'Confusion matrix' }).click()
  await expect(
    page.getByRole('columnheader', { name: 'Failed', exact: true }).first(),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/audits/new')
  await expect(page.getByRole('button', { name: 'Submit audit' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: 'test-results/screenshots/mobile-audit.png', fullPage: true })
})
test('401 redirects while 403 preserves the session; unsafe return URL ignored', async ({
  page,
}) => {
  await page.goto('/login?redirect=//evil.test')
  await page.getByLabel('Username', { exact: true }).fill('reviewer')
  await page.getByLabel('Password', { exact: true }).fill('pass')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  await page.route('**/v1/audits/forbidden', (r) =>
    r.fulfill({ status: 403, json: { data: { error_code: 'FORBIDDEN' } } }),
  )
  await page.goto('/audits/forbidden')
  await expect(
    page.getByText('This action or data is outside your authorized scope.'),
  ).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('pea.session'))).toBeTruthy()
  await page.route('**/v1/audits/expired', (r) =>
    r.fulfill({ status: 401, json: { data: { error_code: 'INVALID_TOKEN' } } }),
  )
  await page.goto('/audits/expired')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
test('selected audit mode stays readable against the dark settings panel', async ({ page }) => {
  await login(page)
  await page.goto('/audits/new')
  const text = page.locator('.audit-settings .el-radio.is-checked .el-radio__label')
  await expect(text).toHaveText('Rule-based')
  await expect(text).toHaveCSS('color', 'rgb(255, 255, 255)')
})
test('login rate limit retains username and clears password without automatic retry', async ({
  page,
}) => {
  let calls = 0
  await page.route('**/v1/auth/login', (route) => {
    calls++
    return route.fulfill({
      status: 429,
      json: { data: { error_code: 'LOGIN_RATE_LIMITED', retry_after_seconds: 30 } },
    })
  })
  await page.goto('/login')
  await page.getByLabel('Username', { exact: true }).fill('reviewer')
  await page.getByLabel('Password', { exact: true }).fill('secret')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: /Try again in/ })).toBeDisabled()
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('reviewer')
  expect(calls).toBe(1)
})
test('followup requires explicit dialog submission and sends the configured profile', async ({
  page,
}) => {
  await login(page)
  await page.goto('/audits/audit_test')
  await page.getByRole('button', { name: 'Find Missing Evidence', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const post = page.waitForRequest(
    (r) => r.url().endsWith('/audits/audit_test/follow-ups') && r.method() === 'POST',
  )
  await page.getByRole('button', { name: 'Start follow-up', exact: true }).click()
  expect((await post).postDataJSON()).toEqual({
    agent_profile: 'tiny',
    idempotency_key: expect.any(String),
  })
  await expect(page.getByRole('heading', { name: 'Evidence Follow-up' })).toBeVisible()
})
