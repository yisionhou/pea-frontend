import { chromium } from '@playwright/test';
import fs from 'node:fs';
const root='../pea-backend/results/agent-validation-20261004-2020';
const manifest=JSON.parse(fs.readFileSync(root+'/run_manifest.json','utf8'));
const row=manifest.results[0];
const token=fs.readFileSync('../pea-backend/.local/agent-viewer-token.txt','utf8').trim();
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const requests=[];
 await page.route('**/*', async route=> {
  const u=new URL(route.request().url());
  if(u.hostname!=='127.0.0.1' && u.hostname!=='localhost') return route.abort();
  if(u.pathname.startsWith('/v1/')) requests.push(u.pathname);
  return route.continue();
 });
 await page.addInitScript(t=>sessionStorage.setItem('pea.session',JSON.stringify({token:t,expiresAt:new Date(Date.now()+3000000).toISOString()})),token);
 const route='http://127.0.0.1:5174/follow-ups/'+row.followup_id;
 await page.goto(route);
 await page.getByRole('heading',{name:'Evidence Follow-up',exact:true}).waitFor();
 await page.getByRole('status').getByText('Search limit stopped').waitFor();
 await page.getByText('No matching evidence was retrieved. The original audit is unchanged. The missing information remains unresolved.',{exact:true}).waitFor();
 await page.getByText(/Agent Trace/).click();
 await page.getByText('Step 2',{exact:true}).waitFor();
 await page.screenshot({path:root+'/frontend-agent003-desktop.png',fullPage:true});
 const status=await page.locator('.agent-stage').textContent();
 const fetched=await page.request.get('http://127.0.0.1:5174/v1/follow-ups/'+row.followup_id,{headers:{Authorization:'Bearer '+token}});
 const view=(await fetched.json()).data;
 if(view.agent_run_id!==row.followup_id || view.stop_reason!=='NO_NEW_EVIDENCE') throw Error('Wrong backend record');
 const blocked=await page.request.post('http://127.0.0.1:5174/v1/audits',{headers:{Authorization:'Bearer '+token},data:{}});
 if(blocked.status()!==405) throw Error('Viewer must deny writes');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:root+'/frontend-agent003-mobile.png',fullPage:true,animations:'disabled'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 const artifact={route,backend:'http://127.0.0.1:8001',displayed_state:status,api_status:fetched.status(),saved_record_matches:true,write_status:blocked.status(),external_requests_allowed:false,mobile_overflow:overflow,observed_local_api_routes:requests};
 fs.writeFileSync(root+'/frontend_verification.json',JSON.stringify(artifact,null,2));
 console.log(JSON.stringify(artifact));
} finally {await browser.close()}
