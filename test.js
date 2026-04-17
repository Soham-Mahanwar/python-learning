
const BACKEND = window.location.origin;
const SK = { KEY:'ot_api_key', SECRET:'ot_api_secret', TOKEN:'ot_access_token', IDX:'ot_selected_index' };
let selectedIdx = 'nifty50';
let generatedToken = '';

window.addEventListener('DOMContentLoaded', () => {
  const savedKey    = ls(SK.KEY)    || '';
  const savedSecret = ls(SK.SECRET) || '';
  const savedToken  = ls(SK.TOKEN)  || '';
  const savedIdx    = ls(SK.IDX)    || 'nifty50';

  if (savedKey)    { el('inpApiKey').value    = savedKey;    el('inpApiKey').classList.add('ok'); }
  if (savedSecret) { el('inpApiSecret').value = savedSecret; el('inpApiSecret').classList.add('ok'); }

  if (!savedToken) {
    const profileLink = document.querySelector('a[href="profile.html"]');
    if (profileLink) profileLink.style.display = 'none';
  }

  selectedIdx = savedIdx;
  highlightIdx(savedIdx);
  onStep1Change();

  if (savedKey && savedToken) {
    generatedToken = savedToken;
    window.location.href = 'index.html';
    return;
  }

  if (savedKey && savedSecret) {
    buildLoginUrl(savedKey);
    goStep(2);
    return;
  }

  goStep(1);
  checkBackend(true);
});

function goStep(n) {
  [1,2,3,4].forEach(i => {
    const nd = el('nd'+i), sc = el('sc'+i);
    nd.className   = 'snode' + (i<n?' done':i===n?' active':'');
    sc.textContent = i<n ? '✓' : String(i);
    el('p'+i).className = 'panel' + (i===n?' active':'');
    if (i<4) el('sl'+i).className = 'sline' + (i<n?' done':'');
  });
  if (n !== 2) { const e = el('step2ErrBox'); if(e) e.innerHTML=''; }
  if (n === 4) checkBackend(true);
}

function onStep1Change() {
  const k=el('inpApiKey').value.trim(), s=el('inpApiSecret').value.trim();
  el('btnStep1').disabled = !(k&&s);
  if(k) el('inpApiKey').classList.add('ok'); else el('inpApiKey').classList.remove('ok');
  if(s) el('inpApiSecret').classList.add('ok'); else el('inpApiSecret').classList.remove('ok');
}

function toggleEye() {
  const inp=el('inpApiSecret'), isPass=inp.type==='password';
  inp.type=isPass?'text':'password';
  el('eyeBtn').textContent=isPass?'🙈':'👁';
}

function doStep1() {
  const key=el('inpApiKey').value.trim(), sec=el('inpApiSecret').value.trim();
  if(!key){toast('Enter your API Key','err');return;}
  if(!sec){toast('Enter your API Secret','err');return;}
  ls_set(SK.KEY,key); ls_set(SK.SECRET,sec);
  buildLoginUrl(key);
  goStep(2);
  toast('Keys saved — open Zerodha login below','ok');
}

function buildLoginUrl(apiKey) {
  const url=`https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
  el('loginUrlTxt').textContent=url;
}

function openKiteLogin() {
  const url=el('loginUrlTxt').textContent;
  if(!url||url==='—'){toast('Go back and enter your API Key first','err');return;}
  window.open(url,'_blank');
  toast('Zerodha login opened in new tab','info');
}

function onReqTokChange() {
  const v=el('inpRequestToken').value.trim();
  el('btnStep2').disabled = v.length<6;
  if(v.length>=6) el('inpRequestToken').classList.add('ok');
  else el('inpRequestToken').classList.remove('ok');
}

async function doStep2() {
  const key    = ls(SK.KEY)    || '';
  const secret = ls(SK.SECRET) || '';
  let   reqTok = el('inpRequestToken').value.trim();

  const prevErr = el('step2ErrBox');
  if(prevErr) prevErr.innerHTML='';

  // Auto-extract token if user pasted full redirect URL
  if(reqTok.includes('request_token=')) {
    try {
      const parsed = new URL(reqTok.startsWith('http') ? reqTok : 'https://x.com/?'+reqTok.split('?')[1]);
      reqTok = parsed.searchParams.get('request_token') || reqTok;
    } catch(e) {
      const m = reqTok.match(/request_token=([^&]+)/);
      if(m) reqTok = m[1];
    }
    el('inpRequestToken').value = reqTok;
  }

  if(!key||!secret){toast('API Key/Secret missing — go back to Step 1','err');return;}
  if(!reqTok){toast('Paste the request_token from the redirect URL','err');return;}

  const btn=el('btnStep2');
  btn.disabled=true;
  btn.innerHTML='⏳ Generating Token…';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(`${BACKEND}/generate-token`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ api_key:key, api_secret:secret, request_token:reqTok }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const d = await res.json();

    if(d.status==='success' && d.access_token) {
      generatedToken = d.access_token;
      ls_set(SK.TOKEN, generatedToken);
      if (d.user_name) ls_set('ot_user_name', d.user_name);
      if (d.user_id) ls_set('ot_user_id', d.user_id);
      fillEnvPreview(key, generatedToken);
      el('tokenResultBox').innerHTML = `
        <div class="box box-s" style="margin-bottom:16px">
          <span class="box-ico">✅</span>
          <div class="box-body">
            <strong>Token generated successfully!</strong>${d.user_name?' Welcome, '+d.user_name+'.':''}
            <br>Valid until midnight IST. Saved to browser.
          </div>
        </div>`;
      el('inpRequestToken').value='';
      el('inpRequestToken').classList.remove('ok');
      el('btnStep2').disabled=true;
      _pushTokenToBackend(key, generatedToken);
      
      toast('Access token ready! Redirecting to home...','ok');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showStep2Error(d.error || 'No access_token in response');
    }
  } catch(e) {
    if(e.name==='TimeoutError'||e.name==='AbortError'||(e.message&&e.message.includes('fetch'))) {
      showStep2Error('Backend is offline or not running.<br>Start it with: <code>uvicorn server:app --host 127.0.0.1 --port 8000</code>');
    } else {
      showStep2Error('Error: '+(e.message||'Unknown error'));
    }
  } finally {
    btn.disabled=false;
    btn.innerHTML='Generate Access Token →';
    onReqTokChange();
  }
}

function showStep2Error(msg) {
  let errBox=el('step2ErrBox');
  if(!errBox){errBox=document.createElement('div');errBox.id='step2ErrBox';el('p2').appendChild(errBox);}
  errBox.innerHTML=`<div class="box box-e" style="margin-top:14px;margin-bottom:0"><span class="box-ico">❌</span><div class="box-body">${msg}</div></div>`;
  toast('Token generation failed','err');
}

function fillEnvPreview(key, token) {
  // Show masked token summary — no .env needed
  const masked = token ? token.slice(0,8) + '...' + token.slice(-4) : '—';
  const summary = el('tokenSummary');
  if (summary) {
    summary.innerHTML = `
      <div style="background:var(--bg3);border:1.5px solid var(--bdr);border-radius:9px;
                  padding:14px 16px;font-family:var(--mono);font-size:12px;line-height:2.2;">
        <div>
          <span style="color:var(--dim)">API_KEY &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=</span>
          <span style="color:var(--blue);margin-left:6px">${key ? key.slice(0,6)+'...'+key.slice(-4) : '—'}</span>
        </div>
        <div>
          <span style="color:var(--dim)">ACCESS_TOKEN =</span>
          <span style="color:var(--grn);margin-left:6px">${masked}</span>
          <span style="color:var(--grn);font-size:10px;margin-left:8px">✓ loaded into server</span>
        </div>
        <div style="margin-top:6px;font-size:10px;color:var(--dim);font-family:var(--body)">
          ⏱ Valid until midnight IST &nbsp;·&nbsp; Repeat login each morning
        </div>
      </div>`;
  }
}





async function checkBackend(silent=false) {
  const bar=el('bkBar'),txt=el('bkTxt'),btn=el('bkBtn'),badge=el('navBadge');
  bar.className='bkbar chk';
  txt.innerHTML='Checking backend at <b>127.0.0.1:8000</b>…';
  btn.classList.add('spin');
  badge.className='tb-badge badge-spin';badge.textContent='● Checking';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const r=await fetch(`${BACKEND}/health`,{signal: controller.signal});
    clearTimeout(timeoutId);
    const d=await r.json();
    const mode=d.paper_mode?'📋 PAPER':'⚡ LIVE';
    const mkt=d.market_open?'🟢 OPEN':'🔴 CLOSED';
    bar.className='bkbar ok';
    txt.innerHTML=`Backend <b style="color:var(--grn)">online</b> · v${d.version||'?'} · ${mode} · ${mkt}`;
    badge.className='tb-badge badge-ok';
    badge.textContent=d.paper_mode?'● Paper':'● Live';
    if(!silent) toast('Backend is online','ok');
  } catch(e) {
    bar.className='bkbar off';
    txt.innerHTML=`Backend <b style="color:var(--red)">offline</b> &nbsp;·&nbsp; Run: <code>uvicorn server:app --port 8000</code>`;
    badge.className='tb-badge badge-off';badge.textContent='● Offline';
    if(!silent) toast('Backend is offline','warn');
  } finally {
    btn.classList.remove('spin');
  }
}

function selIdx(slug,cardEl) {
  selectedIdx=slug;
  ls_set(SK.IDX,slug);
  highlightIdx(slug);
}

function highlightIdx(slug) {
  document.querySelectorAll('.idxcard').forEach(c=>c.classList.remove('on'));
  const c=el('ix-'+slug);if(c)c.classList.add('on');
}

function launch() {
  const token=ls(SK.TOKEN);
  if(!token){toast('No access token — complete all steps first','err');return;}
  toast('Launching…','ok');
  // ── FIXED: route directly to terminal.html with index slug ──
  setTimeout(()=>{ window.location.href=`terminal.html?index=${selectedIdx}`; },400);
}

function clearAll() {
  if(!confirm('Clear all saved credentials?\nYou will need to log in again.')) return;
  Object.values(SK).forEach(k=>localStorage.removeItem(k));
  generatedToken='';
  ['inpApiKey','inpApiSecret','inpRequestToken'].forEach(id=>{
    const e=el(id);if(e){e.value='';e.classList.remove('ok','err');}
  });
  onStep1Change();
  goStep(1);
  toast('Cleared — please log in again','info');
}

async function _pushTokenToBackend(apiKey,token) {
  if(!apiKey||!token) return;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    await fetch(`${BACKEND}/update-token`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({api_key:apiKey,access_token:token}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch(e){ console.info('[login] /update-token unreachable — update .env manually'); }
}

function el(id){return document.getElementById(id);}
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function ls_set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function copyInp(id){const v=el(id)?.value||'';if(!v)return;navigator.clipboard.writeText(v).then(()=>toast('Copied!','ok')).catch(()=>{});}
function copyText(txt){if(!txt)return;navigator.clipboard.writeText(txt).then(()=>toast('Copied!','ok')).catch(()=>{});}
let _tt;
function toast(msg,type='info'){
  const t=el('toastEl');
  const icons={ok:'✓',err:'✗',info:'ℹ',warn:'⚠'};
  t.innerHTML=`<span>${icons[type]||'ℹ'}</span> ${msg}`;
  t.className=`toast show ${type}`;
  clearTimeout(_tt);_tt=setTimeout(()=>{t.className='toast';},3800);
}
