import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const relative=fs.readFileSync('../pea-backend/.local/agent-pair-output.txt','utf8').trim();
const root=path.resolve('../pea-backend',relative);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'run_manifest.json'),'utf8'));
const token=fs.readFileSync('../pea-backend/.local/agent-pair-viewer-token.txt','utf8').trim();
const browser=await chromium.launch({headless:true});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const observed=[];
 await page.route('**/*', route=> {
  const u=new URL(route.request().url());
  if(!['127.0.0.1','localhost'].includes(u.hostname)) return route.abort();
  if(u.pathname.startsWith('/v1/')) observed.push(u.pathname);
  return route.continue();
 });
 await page.addInitScript(t=>sessionStorage.setItem('pea.session',JSON.stringify({token:t,expiresAt:new Date(Date.now()+3000000).toISOString()})),token);
 for(const row of manifest.results) {
  const initialRoute='http://127.0.0.1:5175/audits/'+row.initial_id;
  await page.goto(initialRoute);
  await page.getByRole('heading',{name:'Audit Details',exact:true}).waitFor();
  const audit=await page.request.get('http://127.0.0.1:5175/v1/audits/'+row.initial_id,{headers:{Authorization:'Bearer '+token}});
  const av=(await audit.json()).data;
  if(av.run_id!==row.initial_id || av.assessment.label!==row.initial_label) throw Error('Initial record mismatch');
  let childRoute=null;
  if(row.child_id) {
   childRoute='http://127.0.0.1:5175/audits/'+row.child_id;
   await page.goto(childRoute); await page.getByRole('heading',{name:'Audit Details',exact:true}).waitFor();
   const child=await page.request.get('http://127.0.0.1:5175/v1/audits/'+row.child_id,{headers:{Authorization:'Bearer '+token}});
   const cv=(await child.json()).data;
   if(cv.parent_run_id!==row.initial_id || cv.assessment.label!==row.final_label) throw Error('Child record mismatch');
  }
  const route='http://127.0.0.1:5175/follow-ups/'+row.followup_id;
  await page.goto(route);
  await page.getByRole('heading',{name:'Evidence Follow-up',exact:true}).waitFor();
  const expected=row.child_status==='SUCCEEDED'?'Re-audit completed':'No matching evidence retrieved';
  await page.getByRole('status').getByText(expected).waitFor();
  await page.locator('.dark-panel dd').getByText('Server',{exact:true}).waitFor();
  await page.locator('.dark-panel dd').getByText(row.stop_reason,{exact:true}).waitFor();
  await page.getByText(/Agent Trace/).click();
  await page.getByText('Step 2',{exact:true}).waitFor();
  await page.screenshot({path:path.join(root,row.case_id,'frontend-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,row.case_id,'frontend-mobile.png'),fullPage:true,animations:'disabled'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  await page.setViewportSize({width:1440,height:1000});
  const got=await page.request.get('http://127.0.0.1:5175/v1/follow-ups/'+row.followup_id,{headers:{Authorization:'Bearer '+token}});
  const data=(await got.json()).data;
  if(data.stop_reason!==row.stop_reason || data.reaudit_run_id!==row.child_id) throw Error('Followup mismatch');
  results.push({case_id:row.case_id,initial_route:initialRoute,followup_route:route,child_route:childRoute,displayed_state:expected,stop_actor:'Server',stop_reason:data.stop_reason,initial_and_child_records_match:true,mobile_overflow:overflow,api_status:got.status()});
 }
 const blocked=await page.request.post('http://127.0.0.1:5175/v1/audits',{headers:{Authorization:'Bearer '+token},data:{}});
 if(blocked.status()!==405) throw Error('Read-only viewer did not reject mutation');
 const artifact={verification_type:'Actual persisted live-run records via real local API; no mocked API responses',frontend:'http://127.0.0.1:5175',backend:'http://127.0.0.1:8002',profile:'agent-demo-v2-validated',results,mutation_status:405,external_browser_requests_allowed:false,model_calls_disabled_in_backend:true,observed_local_api_routes:[...new Set(observed)]};
 fs.writeFileSync(path.join(root,'frontend_verification.json'),JSON.stringify(artifact,null,2));
 console.log(JSON.stringify(artifact));
} finally {await browser.close()}
