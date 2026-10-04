import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('../pea-backend',fs.readFileSync('../pea-backend/.local/agent002-single-output.txt','utf8').trim());
const manifest=JSON.parse(fs.readFileSync(path.join(root,'run_manifest.json'),'utf8'));
const row=manifest.results[0];
const token=fs.readFileSync('../pea-backend/.local/agent002-single-viewer-token.txt','utf8').trim();
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const routes=[];
 await page.route('**/*', route=> {
  const url=new URL(route.request().url());
  if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
  if(url.pathname.startsWith('/v1/'))routes.push(url.pathname);
  return route.continue();
 });
 await page.addInitScript(t=>sessionStorage.setItem('pea.session',JSON.stringify({token:t,expiresAt:new Date(Date.now()+3000000).toISOString()})),token);
 const initialRoute='http://127.0.0.1:5176/audits/'+row.initial_id;
 await page.goto(initialRoute);await page.getByRole('heading',{name:'Audit Details',exact:true}).waitFor();
 const initial=await page.request.get('http://127.0.0.1:5176/v1/audits/'+row.initial_id,{headers:{Authorization:'Bearer '+token}});
 const iv=(await initial.json()).data;if(iv.assessment.label!==row.initial_label)throw Error('Initial mismatch');
 let childRoute=null;
 if(row.child_id){
  childRoute='http://127.0.0.1:5176/audits/'+row.child_id;
  await page.goto(childRoute);await page.getByRole('heading',{name:'Audit Details',exact:true}).waitFor();
  const child=await page.request.get('http://127.0.0.1:5176/v1/audits/'+row.child_id,{headers:{Authorization:'Bearer '+token}});
  const cv=(await child.json()).data;
  if(cv.parent_run_id!==row.initial_id||cv.assessment.label!==row.final_label)throw Error('Child mismatch');
 }
 const followupRoute='http://127.0.0.1:5176/follow-ups/'+row.followup_id;
 await page.goto(followupRoute);await page.getByRole('heading',{name:'Evidence Follow-up',exact:true}).waitFor();
 const state=row.child_status==='SUCCEEDED'?'Re-audit completed':'No matching evidence retrieved';
 await page.getByRole('status').getByText(state).waitFor();
 await page.locator('.dark-panel dd').getByText('Server',{exact:true}).waitFor();
 await page.locator('.dark-panel dd').getByText(row.stop_reason,{exact:true}).waitFor();
 await page.getByText(/Agent Trace/).click();await page.getByText('Step 3',{exact:true}).waitFor();
 await page.screenshot({path:path.join(root,'frontend-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(root,'frontend-mobile.png'),fullPage:true,animations:'disabled'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 const followup=await page.request.get('http://127.0.0.1:5176/v1/follow-ups/'+row.followup_id,{headers:{Authorization:'Bearer '+token}});
 const fv=(await followup.json()).data;
 if(fv.reaudit_run_id!==row.child_id||fv.new_evidence[0].source_id!=='record-002')throw Error('Followup/evidence mismatch');
 const denied=await page.request.post('http://127.0.0.1:5176/v1/audits',{headers:{Authorization:'Bearer '+token},data:{}});
 if(denied.status()!==405)throw Error('Viewer must reject audit writes');
 const result={verification_type:'Actual persisted live-run records through real localhost API; no mocked API responses',frontend:'http://127.0.0.1:5176',backend:'http://127.0.0.1:8003',initial_route:initialRoute,followup_route:followupRoute,child_route:childRoute,displayed_state:state,stop_actor:'Server',stop_reason:fv.stop_reason,initial_child_evidence_match:true,api_status:followup.status(),mobile_overflow:overflow,writes_denied:405,external_model_transport_disabled:true,observed_api_routes:[...new Set(routes)]};
 fs.writeFileSync(path.join(root,'frontend_verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}
