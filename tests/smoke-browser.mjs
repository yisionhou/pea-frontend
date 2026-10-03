import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (error) => {
  if (!error.message.includes('ResizeObserver loop')) errors.push(error.message)
})
try {
  await page.goto(process.env.SMOKE_FRONTEND_URL)
  await page.getByLabel('Username', { exact: true }).fill('smoke-reviewer')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: 'Workspace', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Create audit' }).click()
  await page.getByLabel('Case ID', { exact: true }).fill('smoke_case_001')
  await page.getByLabel('Employee ID', { exact: true }).fill('E001')
  await page.getByLabel('Audit criterion').fill('Sales performance')
  await page.getByLabel('Claim', { exact: true }).fill('Exceeded the sales target')
  const posted = page.waitForResponse(
    (r) => r.url().endsWith('/v1/audits') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Submit audit' }).click()
  const response = await posted
  assert.equal(response.status(), 201)
  const audit = (await response.json()).data
  assert.equal(audit.status, 'SUCCEEDED')
  assert.equal(audit.assessment.label, 'INSUFFICIENT_INFORMATION')
  await page.getByRole('heading', { name: 'Audit Details' }).waitFor()
  await page.reload()
  await page
    .getByLabel('Rationale', { exact: true })
    .fill('Please provide the documented target and supporting evidence.')
  const reviewed = page.waitForResponse((r) => r.url().endsWith('/v1/reviews'))
  await page.getByRole('button', { name: 'Submit review' }).click()
  assert.equal((await reviewed).status(), 201)
  await page
    .getByText('Please provide the documented target and supporting evidence.', { exact: true })
    .waitFor()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor()
  assert.equal(await page.evaluate(() => sessionStorage.getItem('pea.session')), null)
  assert.deepEqual(errors, [])
  console.log(
    'PASS: real FastAPI login → rule audit → refresh /me → human review → logout (no model calls).',
  )
} finally {
  await browser.close()
}
