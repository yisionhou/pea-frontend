import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { user, audit, followup } from './fixtures'
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('pea.session', JSON.stringify({ token: 'offline-fixture', expiresAt: '2099-01-01' })))
  await page.route('**/v1/**', route => route.fulfill({ json: { data: route.request().url().endsWith('/auth/me') ? user : audit } }))
})
test('saved agent-003 is unresolved server-bounded no-result, not failure or model stop', async ({ page }) => {
  const root = '../pea-backend/results/agent-validation-20261004-2020/agent-003/'
  const saved = JSON.parse(readFileSync(root + 'followup.json', 'utf8'))
  const initial = JSON.parse(readFileSync(root + 'initial_audit.json', 'utf8'))
  await page.route('**/v1/follow-ups/' + saved.agent_run_id, route => route.fulfill({ json: { data: saved } }))
  await page.route('**/v1/audits/' + initial.run_id, route => route.fulfill({ json: { data: initial } }))
  await page.goto('/follow-ups/' + saved.agent_run_id)
  await expect(page.getByRole('status').getByText('No matching evidence retrieved')).toBeVisible()
  await expect(page.getByText('Consecutive searches added no new evidence. The server stopped the search.', { exact: true })).toBeVisible()
  await expect(page.locator('.dark-panel dd').getByText('Server', { exact: true })).toBeVisible()
  await expect(page.locator('.dark-panel dd').getByText('NO_NEW_EVIDENCE', { exact: true })).toBeVisible()
  await expect(page.getByText('No matching evidence was retrieved. The original audit is unchanged. The missing information remains unresolved.', { exact: true })).toBeVisible()
  await expect(page.getByText('No re-audit result', { exact: true })).toBeVisible()
  await expect(page.getByRole('status').getByText('Technical failure')).toHaveCount(0)
  await expect(page.locator('.dark-panel dd').getByText('Model', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/screenshots/agent003-acceptance-review.png', fullPage: true })
})
test('Workspace card opens existing audit workflow; CTA follows backend eligibility', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Evidence Follow-up Agent' })).toBeVisible()
  await page.screenshot({ path: 'test-results/screenshots/agent-workspace-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/screenshots/agent-workspace-mobile.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.getByRole('button', { name: 'Open follow-up', exact: true }).click()
  await page.getByLabel('Initial audit ID').fill('audit_test')
  await page.getByRole('button', { name: 'Open initial audit' }).click()
  await expect(page).toHaveURL(/\/audits\/audit_test$/)
  await expect(page.getByRole('button', { name: 'Find Missing Evidence' })).toBeVisible()
  await page.route('**/v1/audits/audit_test', route => route.fulfill({ json: { data: { ...audit, followup_eligible: false } } }))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Audit Details' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Find Missing Evidence' })).toHaveCount(0)
})
for (const state of ['unsupported', 'no-results', 'technical-error', 'blocked', 'limit']) {
  test(`Follow-up renders ${state}, evidence, trace and mobile layout`, async ({ page }) => {
    const found = !['no-results', 'blocked', 'limit'].includes(state)
    const record = { ...followup, status: state === 'technical-error' ? 'FAILED' : 'COMPLETED',
      unreviewed_evidence_ids: state === 'technical-error' ? ['ev2'] : [],
      stop_reason: found ? 'SEARCH_COMPLETED' : state === 'limit' ? 'ROUND_LIMIT' : 'AGENT_STOPPED',
      reaudit_status: state === 'unsupported' ? 'SUCCEEDED' : state === 'technical-error' ? 'FAILED' : 'NOT_RUN_NO_NEW_EVIDENCE',
      reaudit_run_id: found ? 'child_test' : null, label_after: state === 'unsupported' ? 'UNSUPPORTED' : null,
      error: state === 'technical-error' ? { error_code: 'PROVIDER_ERROR', message: 'Provider unavailable' } : null,
      new_evidence_ids: found ? ['ev2'] : [], new_evidence: found ? [{ evidence_id: 'ev2', text: 'Official target is higher than actual sales.' }] : [],
      trace: [{ ...followup.trace[0], reason: 'Retrieve the missing target neutrally.', returned_count: found ? 1 : 0 }],
    }
    const child = { ...audit, run_id: 'child_test', parent_run_id: 'audit_test',
      assessment: state === 'technical-error' ? null : { ...audit.assessment, label: 'UNSUPPORTED', missing_information: [] } }
    if (state === 'blocked') Object.assign(record, { status: 'REJECTED', error: { error_code: 'FORBIDDEN', message: 'Outside authorized scope' } })
    await page.route('**/v1/follow-ups/agent_test', route => route.fulfill({ json: { data: record } }))
    await page.route('**/v1/audits/child_test', route => route.fulfill({ json: { data: child } }))
    await page.goto('/follow-ups/agent_test')
    await expect(page.getByRole('heading', { name: 'Evidence Follow-up', exact: true })).toBeVisible()
    await expect(page.getByText('Retrieve the missing target neutrally.', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Re-audit Comparison' })).toBeVisible()
    if (found) {
      await expect(page.getByText('Official target is higher than actual sales.')).toBeVisible()
      await expect(page.locator('.evidence-card').getByText('Not provided', { exact: true })).toHaveCount(4)
    }
    if (state === 'unsupported') await expect(page.locator('.agent-comparison').getByText('Unsupported', { exact: true })).toBeVisible()
    if (state === 'no-results') await expect(page.getByRole('status').getByText('No matching evidence retrieved')).toBeVisible()
    if (state === 'blocked') await expect(page.getByRole('status').getByText('Follow-up blocked')).toBeVisible()
    if (state === 'limit') await expect(page.getByRole('status').getByText('Search limit stopped')).toBeVisible()
    if (state === 'technical-error') {
      await expect(page.getByRole('status').getByText('Technical failure')).toBeVisible()
      await expect(page.getByText('No re-audit result', { exact: true })).toBeVisible()
    }
    await page.getByText(/Agent Trace ·/).click()
    await expect(page.getByText('Step 1', { exact: true })).toBeVisible()
    await page.screenshot({ path: `test-results/screenshots/agent-${state}-desktop.png`, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/screenshots/agent-${state}-mobile.png`, fullPage: true, animations: 'disabled' })
  })
}
