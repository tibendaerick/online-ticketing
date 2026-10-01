'use strict';
const CFG = {
  WA: '256766845860', // organizer WhatsApp number (international format, no +)
  SALT: 'NexUp::TicketiPass::2026',
  KEY: 'NXP-K3Y-9f2c71-TP26',
  IDLE: 600000,
  STAFF: [
    { n: 'erick tibenda', h: 'b2013e79905766f43620524ab7624b82219f7167c9e4abd21895210edd065400' },
    { n: 'nasser kato', h: 'ab0b6409f960d4563b62b4ac97f1bb745352706bd618d75d1e0a262382d88eb1' }
  ]
};
const EVENTS = [
  { id: 'e1', cat: 'Sports', t: 'Regional Football Finals', d: '2026-11-14T16:00', v: 'Mandela National Stadium, Kampala', p: 20000, cap: 40000, sold: 31200, i: '⚽' },
  { id: 'e2', cat: 'Concerts', t: 'Kampala Live Music Fest', d: '2026-11-21T18:00', v: 'Lugogo Cricket Oval, Kampala', p: 50000, cap: 8000, sold: 5650, i: '🎤' },
  { id: 'e3', cat: 'Nightlife', t: 'Kaz VIP Lounge Night', d: '2026-10-24T21:00', v: 'Kaz Lounge, Mubende', p: 30000, cap: 400, sold: 342, i: '🍾' },
  { id: 'e4', cat: 'Tech', t: 'AI & Automation Workshop', d: '2026-10-17T09:00', v: 'Innovation Village, Mubende', p: 75000, cap: 150, sold: 96, i: '💻' },
  { id: 'e5', cat: 'Sports', t: 'Masaza Cup Semi-Final', d: '2026-12-05T15:00', v: "NTC Playground, Mubende", p: 15000, cap: 15000, sold: 9100, i: '🏆' },
  { id: 'e6', cat: 'Nightlife', t: 'Afrobeats Pool Party', d: '2026-12-19T14:00', v: 'Cafe Milano, Hoima', p: 40000, cap: 600, sold: 575, i: '🌴' }
];
const TIERS = {
  GA: { n: 'General Admission', m: 1, s: 1, d: 'Standard entry' },
  VIP: { n: 'VIP Pass', m: 2.5, s: 1, d: 'Fast lane + premium zone' },
  VVIP: { n: 'VVIP Table / Booth', m: 8, s: 6, d: 'Reserved table, seats 6' }
};

const $ = (s, r = document) => r.querySelector(s);
const ls = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const money = n => 'UGX ' + Math.round(n).toLocaleString('en-UG');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const title = s => String(s).replace(/\b\w/g, c => c.toUpperCase());
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const enc = s => new TextEncoder().encode(s);
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc(s)));
const sign = async id => {
  const k = await crypto.subtle.importKey('raw', enc(CFG.KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc(id))).slice(0, 10).toUpperCase();
};
const tickets = () => ls.get('tp_tickets', {});
const soldOf = e => Math.min(e.cap, e.sold + Object.values(tickets()).filter(t => t.eid === e.id).reduce((a, t) => a + t.seats, 0));
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const audit = m => { const l = ls.get('tp_audit', []); l.unshift({ m, t: Date.now() }); ls.set('tp_audit', l.slice(0, 60)); };
const toast = m => {
  const t = $('#toast'); t.textContent = m; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600);
};

/* ---------- Marketplace ---------- */
let cat = 'All';
function renderFilters() {
  const cs = ['All', ...new Set(EVENTS.map(e => e.cat))];
  $('#filters').innerHTML = cs.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
}
function renderEvents() {
  $('#events').innerHTML = EVENTS.filter(e => cat === 'All' || e.cat === cat).map(e => {
    const s = soldOf(e), left = e.cap - s, pct = Math.round(s / e.cap * 100);
    return `<article class="card glass">
      <div class="cover c-${e.cat}"><span class="tag">${e.cat}</span><span class="emoji">${e.i}</span></div>
      <div class="body">
        <h3>${e.t}</h3>
        <p class="meta">📅 ${fmtDate(e.d)} · ${fmtTime(e.d)}</p>
        <p class="meta">📍 ${e.v}</p>
        <div class="bar"><i style="width:${pct}%" class="${pct > 85 ? 'hot' : ''}"></i></div>
        <p class="meta small">${left.toLocaleString()} of ${e.cap.toLocaleString()} seats left${pct > 85 ? ' · 🔥 Selling fast' : ''}</p>
        <div class="foot"><div><small>From</small><b class="price">${money(e.p)}</b></div>
        <button class="btn" data-book="${e.id}" ${left < 1 ? 'disabled' : ''}>${left < 1 ? 'Sold Out' : 'Book Ticket'}</button></div>
      </div></article>`;
  }).join('');
}

/* ---------- Modal ---------- */
const modal = $('#modal'), sheet = $('#sheet');
function openModal(h) { sheet.innerHTML = h; sheet.onclick = null; sheet.onchange = null; modal.hidden = false; document.body.classList.add('lock'); }
function closeModal() { modal.hidden = true; document.body.classList.remove('lock'); }

/* ---------- Booking ---------- */
function openBooking(id) {
  const e = EVENTS.find(x => x.id === id);
  let tier = 'GA', qty = 1;
  openModal(`<button class="x" data-close>✕</button>
    <h2>${e.t}</h2><p class="meta">📅 ${fmtDate(e.d)} · 📍 ${e.v}</p>
    <div class="tiers">${Object.entries(TIERS).map(([k, t]) => `<label class="tier"><input type="radio" name="tier" value="${k}" ${k === 'GA' ? 'checked' : ''}><span><b>${t.n}</b><small>${t.d}</small></span><em>${money(e.p * t.m)}</em></label>`).join('')}</div>
    <div class="qty"><span>Quantity</span><div><button class="round" data-q="-1">−</button><b id="qv">1</b><button class="round" data-q="1">+</button></div></div>
    <input id="aName" placeholder="Attendee full name" maxlength="40" autocomplete="name">
    <input id="aPhone" placeholder="Phone (optional)" inputmode="tel" maxlength="16">
    <div class="total"><span>Total</span><b id="tot"></b></div>
    <div class="row"><button class="btn green" id="waBtn">💬 Send Ticket to WhatsApp</button><button class="btn" id="dlBtn">⬇ Instant Download / Print</button></div>`);
  const maxQ = () => Math.max(1, Math.min(10, Math.floor((e.cap - soldOf(e)) / TIERS[tier].s)));
  const upd = () => { $('#qv').textContent = qty; $('#tot').textContent = money(e.p * TIERS[tier].m * qty); };
  const issue = async () => {
    const name = $('#aName').value.trim(), phone = $('#aPhone').value.trim();
    if (name.length < 2) { toast('Please enter the attendee name'); $('#aName').focus(); return null; }
    const tid = 'TP-' + hex(crypto.getRandomValues(new Uint8Array(5))).toUpperCase();
    const t = { id: tid, eid: e.id, tier, qty, seats: qty * TIERS[tier].s, name, phone, total: e.p * TIERS[tier].m * qty, at: Date.now(), sig: await sign(tid), used: false };
    const all = tickets(); all[tid] = t; ls.set('tp_tickets', all);
    audit(`Ticket issued ${tid}`); renderEvents(); return t;
  };
  sheet.onchange = ev => { if (ev.target.name === 'tier') { tier = ev.target.value; qty = Math.min(qty, maxQ()); upd(); } };
  sheet.onclick = async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.q) { qty = Math.min(maxQ(), Math.max(1, qty + +b.dataset.q)); upd(); }
    if (b.id === 'dlBtn') { const t = await issue(); if (t) showTicket(t); }
    if (b.id === 'waBtn') {
      const t = await issue(); if (!t) return;
      window.open(`https://wa.me/${CFG.WA}?text=${encodeURIComponent(waMsg(t, e))}`, '_blank', 'noopener');
      showTicket(t);
    }
  };
  upd();
}
const waMsg = (t, e) => `🎟️ *TICKETIPASS | DIGITAL TICKET*
━━━━━━━━━━━━━━
*Event:* ${e.t}
*Date:* ${fmtDate(e.d)}, ${fmtTime(e.d)}
*Venue:* ${e.v}
*Tier:* ${TIERS[t.tier].n} × ${t.qty}
*Attendee:* ${t.name}${t.phone ? '\n*Phone:* ' + t.phone : ''}
*Total:* ${money(t.total)}
━━━━━━━━━━━━━━
*Ticket ID:* ${t.id}
*Verify Code:* ${t.sig}
Show this ID or QR at the gate. Single entry only.
_Powered by NexUp Technologies_`;

function showTicket(t) {
  const e = EVENTS.find(x => x.id === t.eid);
  openModal(`<button class="x" data-close>✕</button>
    <div id="ticketCard" class="ticket">
      <div class="t-head"><b>🎟 TicketiPass</b><span>${TIERS[t.tier].n}</span></div>
      <div class="t-body">
        <h2>${e.t}</h2><p>📅 ${fmtDate(e.d)} · ${fmtTime(e.d)}</p><p>📍 ${e.v}</p>
        <div class="t-grid"><div><small>ATTENDEE</small><b>${esc(t.name)}</b></div><div><small>ADMITS</small><b>${t.qty} ${t.tier === 'VVIP' ? 'table(s)' : 'person(s)'}</b></div>
        <div><small>PAID</small><b>${money(t.total)}</b></div><div><small>VERIFY CODE</small><b>${t.sig}</b></div></div>
        <div id="qr"></div><p class="tid">${t.id}</p>
      </div>
      <div class="t-foot">Powered by NexUp Tech Group · Single entry · Do not share this QR</div>
    </div>
    <div class="row"><button class="btn green" id="pngBtn">⬇ Download QR</button><button class="btn" id="prBtn">🖨 Print / Save PDF</button></div>`);
  new QRCode($('#qr'), { text: `TP|${t.id}|${t.sig}`, width: 168, height: 168, colorDark: '#111827', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  sheet.onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'prBtn') window.print();
    if (b.id === 'pngBtn') {
      const c = $('#qr canvas'), a = document.createElement('a');
      a.href = c.toDataURL('image/png'); a.download = `${t.id}-QR.png`; a.click();
    }
  };
}

/* ---------- Staff authentication ---------- */
const getS = () => { try { const s = JSON.parse(sessionStorage.getItem('tp_s')); return s && s.exp > Date.now() ? s : null; } catch { return null; } };
let idleT;
function touch() {
  const s = getS(); if (!s) return;
  s.exp = Date.now() + CFG.IDLE; sessionStorage.setItem('tp_s', JSON.stringify(s));
  clearTimeout(idleT); idleT = setTimeout(() => logout('Session expired. Please sign in again.'), CFG.IDLE);
}
['click', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, touch, { passive: true }));

function openLogin() {
  openModal(`<button class="x" data-close>✕</button><h2>🔐 Staff Access</h2>
    <p class="meta">Authorised gate staff only. All attempts are logged.</p>
    <input id="sName" placeholder="Staff name" autocomplete="off" autocapitalize="off">
    <input id="sPin" type="password" inputmode="numeric" maxlength="6" placeholder="Private PIN" autocomplete="off">
    <p id="lerr" class="err"></p><button class="btn" id="loginBtn" style="width:100%">Unlock Gate Hub</button>`);
  $('#loginBtn').onclick = login;
  $('#sPin').onkeydown = e => { if (e.key === 'Enter') login(); };
}
async function login() {
  const lk = ls.get('tp_lock', { f: 0, u: 0 }), err = $('#lerr');
  if (lk.u > Date.now()) { err.textContent = `Locked. Try again in ${Math.ceil((lk.u - Date.now()) / 1000)}s.`; return; }
  const n = $('#sName').value.trim().toLowerCase(), pin = $('#sPin').value;
  const h = await sha(`${CFG.SALT}|${n}|${pin}`);
  const u = CFG.STAFF.find(s => s.n === n && s.h === h);
  audit(u ? `Login OK: ${title(n)}` : `Login FAILED: ${esc(n || 'unknown')}`);
  if (!u) {
    lk.f++; if (lk.f >= 3) lk.u = Date.now() + 30000 * (lk.f - 2);
    ls.set('tp_lock', lk);
    err.textContent = lk.f >= 3 ? 'Too many attempts. Temporarily locked.' : 'Invalid credentials.';
    $('#sPin').value = ''; return;
  }
  ls.set('tp_lock', { f: 0, u: 0 });
  sessionStorage.setItem('tp_s', JSON.stringify({ n: u.n, exp: Date.now() + CFG.IDLE }));
  closeModal(); enterGate();
}
function enterGate() {
  $('#marketView').hidden = true; $('#gateView').hidden = false;
  $('#staffName').textContent = 'On duty: ' + title(getS().n);
  $('#staffBtn').textContent = '🚪 Exit Staff Mode';
  renderGate(); touch();
}
async function logout(msg) {
  await stopCam(); sessionStorage.removeItem('tp_s'); clearTimeout(idleT);
  audit('Staff logout');
  $('#gateView').hidden = true; $('#marketView').hidden = false;
  $('#staffBtn').textContent = '🔐 Staff Mode'; $('#result').className = 'result';
  if (msg) toast(msg);
}

/* ---------- Gate verification ---------- */
async function verify(raw) {
  const s = getS(); if (!s) { logout('Session expired. Please sign in again.'); return; }
  raw = String(raw).trim().toUpperCase(); if (!raw) return;
  let id = raw, sg = null;
  if (raw.startsWith('TP|')) { const p = raw.split('|'); id = p[1]; sg = p[2]; }
  const all = tickets(), t = all[id];
  let r;
  if (!t || (sg && sg !== t.sig) || t.sig !== await sign(t.id)) {
    r = { ok: false, m: 'No matching genuine ticket on record.' };
    audit(`DENIED unknown/forged: ${esc(id.slice(0, 16))}`);
  } else if (t.used) {
    r = { ok: false, m: `Already scanned at ${fmtTime(t.usedAt)} by ${title(t.by)}.`, t };
    audit(`DENIED reuse: ${t.id}`);
  } else {
    t.used = true; t.usedAt = Date.now(); t.by = s.n; ls.set('tp_tickets', all);
    r = { ok: true, m: 'Entry recorded. Welcome in!', t };
    audit(`GRANTED: ${t.id} (${title(s.n)})`);
  }
  const ev = r.t && EVENTS.find(x => x.id === r.t.eid);
  $('#result').className = 'result ' + (r.ok ? 'ok' : 'bad');
  $('#result').innerHTML = `<div class="big">${r.ok ? '✅' : '⛔'}</div>
    <h2>${r.ok ? 'VALID TICKET - ACCESS GRANTED' : 'INVALID / ALREADY USED TICKET'}</h2><p>${r.m}</p>
    ${r.t ? `<p><b>${esc(r.t.name)}</b> · ${TIERS[r.t.tier].n} × ${r.t.qty}</p><p>${ev.t}</p>` : ''}`;
  if (navigator.vibrate) navigator.vibrate(r.ok ? 120 : [80, 60, 80]);
  renderGate();
}
let qr = null, last = '', lastAt = 0;
async function startCam() {
  if (qr) return;
  qr = new Html5Qrcode('reader');
  try {
    await qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } }, txt => {
      const n = Date.now(); if (txt === last && n - lastAt < 3000) return;
      last = txt; lastAt = n; verify(txt);
    });
    $('#camBtn').textContent = '⏹ Stop Scanner';
  } catch { qr = null; toast('Camera unavailable. Use manual ID entry.'); }
}
async function stopCam() {
  if (!qr) return;
  try { await qr.stop(); qr.clear(); } catch { /* scanner already stopped */ }
  qr = null; $('#camBtn').textContent = '📷 Start Scanner';
}
function renderGate() {
  const a = Object.values(tickets()), u = a.filter(t => t.used).length;
  $('#stats').innerHTML = [['Issued', a.length], ['Checked in', u], ['Pending', a.length - u]]
    .map(([k, v]) => `<div class="stat glass"><b>${v}</b><small>${k}</small></div>`).join('');
  $('#log').innerHTML = ls.get('tp_audit', []).slice(0, 8)
    .map(l => `<li><span>${l.m}</span><small>${fmtTime(l.t)}</small></li>`).join('') || '<li>No activity yet</li>';
}

/* ---------- Wiring ---------- */
$('#filters').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; renderFilters(); renderEvents(); } });
$('#events').addEventListener('click', e => { const b = e.target.closest('[data-book]'); if (b) openBooking(b.dataset.book); });
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
$('#staffBtn').addEventListener('click', () => {
  if (!$('#gateView').hidden) logout();
  else if (getS()) enterGate();
  else openLogin();
});
$('#camBtn').addEventListener('click', () => (qr ? stopCam() : startCam()));
$('#manualForm').addEventListener('submit', e => { e.preventDefault(); verify($('#manualId').value); $('#manualId').value = ''; });
$('#resetBtn').addEventListener('click', () => {
  if (!confirm('Erase all demo tickets and activity?')) return;
  localStorage.removeItem('tp_tickets'); localStorage.removeItem('tp_audit');
  $('#result').className = 'result'; renderEvents(); renderGate(); toast('Demo data cleared');
});
renderFilters(); renderEvents();
if (getS()) enterGate();