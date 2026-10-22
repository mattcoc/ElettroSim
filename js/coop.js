/* ElettroSim · Lavoro condiviso in tempo reale (Lavora insieme). */
'use strict';
/* ---------- lavoro condiviso (cowork) ----------
   Lo schema condiviso vive in shared/{stanza}. Ogni modifica locale viene unita a quella remota
   elemento per elemento (unione a tre vie rispetto all’ultima versione sincronizzata), così due persone
   possono lavorare insieme senza sovrascriversi. */
const COOP = { room: null, base: null, rev: 0, unsub: null, punsub: null, timer: null, tick: null, hb: null, pushing: false, dirty: false, pending: null, peers: [], state: 'ok' };
function syncStr(d) { return JSON.stringify({ v: d.v || 2, meta: d.meta, pages: d.pages }); }
function mergeDoc(B, L, R) {
  const J = x => JSON.stringify(x);
  const pick = (b, l, r) => (J(l) === J(b) ? r : l);
  const list = (b, l, r, inner) => {
    const M = a => new Map((a || []).map(x => [x.id, x]));
    const bm = M(b), lm = M(l), rm = M(r), out = [];
    for (const id of [...rm.keys(), ...[...lm.keys()].filter(k => !rm.has(k))]) {
      const bv = bm.get(id), lv = lm.get(id), rv = rm.get(id);
      const v = inner && bv && lv && rv ? inner(bv, lv, rv) : pick(bv, lv, rv);
      if (v !== undefined) out.push(v);
    }
    return out;
  };
  const mb = B.meta || {}, ml = L.meta || {}, mr = R.meta || {}, meta = {};
  for (const k of new Set([...Object.keys(mr), ...Object.keys(ml)])) { const v = pick(mb[k], ml[k], mr[k]); if (v !== undefined) meta[k] = v; }
  const pages = list(B.pages, L.pages, R.pages, (b, l, r) => ({ id: r.id, name: pick(b.name, l.name, r.name), comps: list(b.comps, l.comps, r.comps), wires: list(b.wires, l.wires, r.wires) }));
  return { v: R.v || 2, meta, pages };
}
function withPage(o, pageId) { const i = o.pages.findIndex(p => p.id === pageId); o.page = i < 0 ? 0 : i; return validateDoc(o); }
function roomRef(L, id) { return L.F.doc(L.db, 'shared', id || COOP.room); }
function coopLink(id) { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('stanza', id || COOP.room); return u.toString(); }
function setURLRoom(id) { try { const u = new URL(location.href); if (id) u.searchParams.set('stanza', id); else u.searchParams.delete('stanza'); history.replaceState(null, '', u.toString()); } catch (e) { /* URL non modificabile */ } }
function coopState(st) {
  COOP.state = st;
  const c = $('#coopChip'); if (!c) return;
  c.hidden = !COOP.room;
  c.classList.toggle('sync', st === 'sync'); c.classList.toggle('err', st === 'err');
  const n = COOP.peers.length;
  $('#coopChipT').textContent = st === 'err' ? (navigator.onLine ? 'Condiviso · non sincronizzato' : 'Condiviso · offline, riprovo…') : n ? `Condiviso · ${n + 1} persone` : 'Condiviso · solo tu';
  document.body.classList.toggle('coop-on', !!COOP.room);
  const b = $('#bCoop'); if (b) b.classList.toggle('on', !!COOP.room);
}
async function coopCreate() {
  if (!CLOUD.user) { await cloudSignIn(); if (!CLOUD.user) return; }
  if (SIM.on) stopSim();
  const a = new Uint8Array(15); crypto.getRandomValues(a);
  const id = [...a].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
  const data = syncStr(doc);
  if (data.length > 900000) { toast('Lo schema è troppo grande per essere condiviso (massimo circa 900 kB): riduci le immagini.', 'err'); return; }
  try {
    const L = await cloudLib();
    await L.F.setDoc(roomRef(L, id), { data, rev: 1, owner: CLOUD.user.uid, ownerName: CLOUD.user.displayName || '', title: doc.meta.title || '', at: Date.now() });
    coopAttach(id, data, 1);
    openCoop();
  } catch (e) { toast('Impossibile creare la sessione condivisa. Controlla la connessione e le regole di Firestore.', 'err'); }
}
async function coopJoin(id) {
  if (COOP.room === id) return;
  let snap;
  try { const L = await cloudLib(); snap = await L.F.getDoc(roomRef(L, id)); }
  catch (e) { toast('Impossibile aprire la sessione condivisa. Controlla la connessione.', 'err'); return; }
  if (!snap.exists()) { toast('Sessione condivisa non trovata: forse è stata chiusa.', 'err'); setURLRoom(null); return; }
  const r = snap.data();
  replaceGuard(() => {
    if (COOP.room) coopLeave(true);
    if (SIM.on) stopSim();
    try { doc = validateDoc(JSON.parse(r.data)); } catch (e) { toast('Lo schema condiviso è danneggiato.', 'err'); return; }
    setCloudId(null); touch();
    ui.sel.clear(); ui.draft = null; ui.place = null;
    resetHistory(); renderTabs(); refreshPanels(); fitView(); render();
    LS.set('elettrosim.current', snapshot());
    coopAttach(id, r.data, r.rev);
    toast(`Sei entrato nella sessione condivisa${r.ownerName ? ` di ${r.ownerName}` : ''}. Le modifiche si vedono in tempo reale.`);
  });
}
async function coopAttach(id, data, rev) {
  COOP.room = id; COOP.base = data; COOP.rev = rev; COOP.peers = []; COOP.pending = null; COOP.dirty = false;
  setURLRoom(id); coopState('ok');
  const L = await cloudLib();
  COOP.unsub = L.F.onSnapshot(roomRef(L, id), s => {
    if (COOP.room !== id) return;
    if (!s.exists()) { toast('La sessione condivisa è stata chiusa. Lo schema resta aperto qui.'); coopLeave(true); return; }
    const r = s.data();
    if (r.rev > COOP.rev) applyRemote(r);
  }, () => coopState('err'));
  const me = CLOUD.user;
  const pres = () => L.F.setDoc(L.F.doc(L.db, 'shared', id, 'people', me.uid), { name: me.displayName || me.email || 'Utente', photo: me.photoURL || '', page: (doc.pages[doc.page] || {}).name || '', at: Date.now() }).catch(() => {});
  pres(); COOP.hb = setInterval(pres, 25000);
  COOP.punsub = L.F.onSnapshot(L.F.collection(L.db, 'shared', id, 'people'), q => {
    if (COOP.room !== id) return;
    const old = new Set(COOP.peers.map(p => p.uid));
    COOP.peers = q.docs.map(d => Object.assign({ uid: d.id }, d.data())).filter(p => p.uid !== me.uid && Date.now() - (p.at || 0) < 70000);
    for (const p of COOP.peers) if (!old.has(p.uid)) toast(`${p.name} sta lavorando con te.`);
    coopState(COOP.state);
    if ($('#coopPeers')) $('#coopPeers').innerHTML = peersHTML();
  }, () => {});
  COOP.tick = setInterval(() => { if (COOP.pending && !busyLocal()) { const r = COOP.pending; COOP.pending = null; applyRemote(r); } }, 400);
}
function busyLocal() { return !!(SIM.on || ui.drag || ui.draft || ui.libDrag || ui.shapeDraft || ui.band); }
function applyRemote(r) {
  if (r.rev <= COOP.rev) return;
  if (busyLocal()) { COOP.pending = r; return; }
  const cur = syncStr(doc), pageId = (doc.pages[doc.page] || {}).id;
  let B, R;
  try { B = JSON.parse(COOP.base); R = JSON.parse(r.data); } catch (e) { return; }
  const next = cur === COOP.base || cur === r.data ? withPage(R, pageId) : withPage(mergeDoc(B, JSON.parse(cur), R), pageId);
  if (cur !== COOP.base && cur !== r.data) COOP.dirty = true;
  // anche la cronologia di Annulla viene riportata sopra le modifiche dell’altro, così Annulla non cancella il suo lavoro
  const from = Math.max(0, hist.i - 40);
  hist.stack = hist.stack.slice(from, hist.i + 1).map(sn => { try { const o = JSON.parse(sn), pid = (o.pages[o.page] || {}).id; return JSON.stringify(withPage(mergeDoc(B, o, R), pid)); } catch (e) { return sn; } });
  hist.i = hist.stack.length - 1;
  doc = next; touch();
  hist.stack[hist.i] = snapshot();
  COOP.base = r.data; COOP.rev = r.rev;
  for (const id of [...ui.sel]) if (!cmap().has(id) && !doc.wires.some(w => w.id === id)) ui.sel.delete(id);
  updUndo(); renderTabs(); refreshPanels(); render();
  LS.set('elettrosim.current', snapshot());
  if (COOP.dirty) coopSchedule();
}
function coopSchedule() {
  if (!COOP.room || SIM.on) return;
  clearTimeout(COOP.timer);
  coopState('sync');
  COOP.timer = setTimeout(coopPush, 500);
}
async function coopPush() {
  if (!COOP.room) return;
  if (COOP.pushing) { COOP.dirty = true; return; }
  const local = syncStr(doc), id = COOP.room;
  if (local === COOP.base) { COOP.dirty = false; coopState('ok'); return; }
  if (local.length > 900000) { coopState('err'); toast('Lo schema è diventato troppo grande per la condivisione: riduci le immagini.', 'err'); return; }
  COOP.pushing = true; COOP.dirty = false;
  try {
    const L = await cloudLib(), ref = roomRef(L, id), me = CLOUD.user;
    const res = await L.F.runTransaction(L.db, async tx => {
      const s = await tx.get(ref);
      if (!s.exists()) return { gone: true };
      const r = s.data();
      if (r.rev !== COOP.rev) return { remote: r };
      tx.update(ref, { data: local, rev: r.rev + 1, at: Date.now(), by: me.uid, title: doc.meta.title || '' });
      return { rev: r.rev + 1 };
    });
    if (COOP.room !== id) return;
    if (res.gone) { toast('La sessione condivisa è stata chiusa. Lo schema resta aperto qui.'); coopLeave(true); return; }
    if (res.remote) { applyRemote(res.remote); COOP.dirty = true; }
    else { COOP.base = local; COOP.rev = Math.max(COOP.rev, res.rev); }
    coopState('ok');
  } catch (e) { coopState('err'); COOP.dirty = true; }
  finally {
    COOP.pushing = false;
    if (COOP.room === id && (COOP.dirty || syncStr(doc) !== COOP.base)) { clearTimeout(COOP.timer); COOP.timer = setTimeout(coopPush, COOP.state === 'err' ? 4000 : 300); }
  }
}
function coopLeave(silent) {
  const id = COOP.room; if (!id) return;
  if (COOP.unsub) COOP.unsub(); if (COOP.punsub) COOP.punsub();
  clearInterval(COOP.hb); clearInterval(COOP.tick); clearTimeout(COOP.timer);
  if (CLOUD.user) cloudLib().then(L => L.F.deleteDoc(L.F.doc(L.db, 'shared', id, 'people', CLOUD.user.uid))).catch(() => {});
  Object.assign(COOP, { room: null, base: null, rev: 0, unsub: null, punsub: null, peers: [], pending: null, dirty: false });
  setURLRoom(null); coopState('ok');
  if (!silent) toast('Sei uscito dalla sessione condivisa. Lo schema resta aperto qui.');
}
function coopFromURL() {
  let id = null;
  try { id = new URL(location.href).searchParams.get('stanza'); } catch (e) { id = null; }
  if (!id || !/^[a-z0-9]{10,40}$/.test(id) || COOP.room === id) return;
  if (CLOUD.user) { coopJoin(id); return; }
  const m = modal('Invito a lavorare insieme', '<p class="note" style="font-size:13px">Sei stato invitato a lavorare su uno schema condiviso: vedrai in tempo reale le modifiche degli altri e loro vedranno le tue. Per partecipare accedi con il tuo account Google.</p>',
    '<button class="pbtn" data-c>Non ora</button><button class="pbtn primary" data-ok>Accedi con Google</button>');
  m.querySelector('[data-c]').onclick = () => { closeModal(); setURLRoom(null); };
  m.querySelector('[data-ok]').onclick = () => { closeModal(); cloudSignIn(); };
}
function peersHTML() {
  const me = CLOUD.user, av = p => `<span class="av">${p.photo ? `<img src="${esc(p.photo)}" alt="" referrerpolicy="no-referrer">` : esc((p.name || '?')[0].toUpperCase())}</span>`;
  return [`<div class="peer">${av({ name: me.displayName || me.email, photo: me.photoURL })}<b>${esc(me.displayName || me.email || 'Tu')}</b><small>tu</small></div>`,
    ...COOP.peers.map(p => `<div class="peer">${av(p)}<b>${esc(p.name)}</b><small>${p.page ? esc(p.page) : ''}</small></div>`)].join('') +
    (COOP.peers.length ? '' : '<p class="empty">Nessun altro per ora. Manda il link a chi deve lavorare con te.</p>');
}
function openCoop() {
  if (!FIREBASE_CONFIG) return;
  if (!COOP.room) {
    const m = modal('Lavora insieme', `<p class="note" style="font-size:13px">Crea una sessione condivisa e manda il link a un compagno o all’insegnante: lavorerete sullo stesso schema nello stesso momento, ognuno dal proprio dispositivo, e vedrete subito le modifiche dell’altro.</p>
      <ol class="steps"><li><div><b>Crea la sessione</b>Lo schema aperto ora diventa condiviso.</div></li><li><div><b>Condividi il link</b>Chi lo apre accede con Google ed entra subito.</div></li><li><div><b>Lavorate insieme</b>Potete modificare anche lo stesso foglio: le modifiche si uniscono da sole.</div></li></ol>`,
      `<button class="pbtn" data-c>Annulla</button><button class="pbtn primary" data-ok>${CLOUD.user ? 'Crea sessione condivisa' : 'Accedi con Google e crea'}</button>`);
    m.querySelector('[data-c]').onclick = closeModal;
    m.querySelector('[data-ok]').onclick = () => { closeModal(); coopCreate(); };
    return;
  }
  const link = coopLink();
  const m = modal('Sessione condivisa', `<div class="f"><label for="coopLink">Link da condividere</label><div class="linkrow"><input id="coopLink" type="text" readonly value="${esc(link)}"><button class="pbtn primary" data-copy>Copia</button>${navigator.share ? '<button class="pbtn" data-share>Condividi</button>' : ''}</div></div>
    <h3 class="mh3">Chi sta lavorando</h3><div class="stat" id="coopPeers">${peersHTML()}</div>
    <p class="note">Chiunque abbia il link e acceda con Google può vedere e modificare questo schema. Per tenere una tua copia personale usa File › Salva nel mio account.</p>`,
    '<button class="pbtn danger" data-leave>Esci dalla sessione</button><button class="pbtn primary" data-c>Chiudi</button>');
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-copy]').onclick = async () => { const i = $('#coopLink'); try { await navigator.clipboard.writeText(link); toast('Link copiato.'); } catch (e) { i.focus(); i.select(); toast('Seleziona il link e copialo.'); } };
  const sh = m.querySelector('[data-share]'); if (sh) sh.onclick = () => navigator.share({ title: 'ElettroSim', text: `Lavora con me sullo schema “${doc.meta.title || 'ElettroSim'}”`, url: link }).catch(() => {});
  m.querySelector('[data-leave]').onclick = () => { closeModal(); coopLeave(); };
}
window.addEventListener('pagehide', () => { if (COOP.room && CLOUD.user) cloudLib().then(L => L.F.deleteDoc(L.F.doc(L.db, 'shared', COOP.room, 'people', CLOUD.user.uid))).catch(() => {}); });
function replaceGuard(fn) {
  if (!allComps().length) { fn(); return; }
  const m = modal('Sostituire lo schema aperto?', `<p class="note" style="font-size:13px">Lo schema “${esc(doc.meta.title || 'senza titolo')}” verrà chiuso. Puoi salvarlo${CLOUD.user ? ' nel tuo account' : ' nel browser'} prima di continuare.</p>`,
    '<button class="pbtn" data-c>Annulla</button><button class="pbtn" data-n>Continua senza salvare</button><button class="pbtn primary" data-s>Salva e continua</button>');
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-n]').onclick = () => { closeModal(); fn(); };
  m.querySelector('[data-s]').onclick = () => { if (CLOUD.user) saveToCloud(); else saveToBrowser(); closeModal(); fn(); };
}
function docCount(d) { if (!d) return 0; if (Array.isArray(d.pages)) return d.pages.reduce((n, p) => n + (p && Array.isArray(p.comps) ? p.comps.length : 0), 0); return Array.isArray(d.comps) ? d.comps.length : 0; }
function openDialog() {
  const P = projects(), names = Object.keys(P).sort((a, b) => (P[b].at || 0) - (P[a].at || 0));
  const fmt = t => { try { return new Date(t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
  let body = '';
  if (FIREBASE_CONFIG) body += `<h3 class="mh3">Nel tuo account</h3><div id="cloudList">${CLOUD.user ? '<p class="empty">Caricamento…</p>' : '<div class="cloudbox"><p class="note">Accedi con Google per salvare gli schemi online e ritrovarli su qualsiasi computer, tablet o telefono.</p><div class="acts"><button class="pbtn primary" data-login>Accedi con Google</button></div></div>'}</div>`;
  body += '<h3 class="mh3">Salvati in questo browser</h3>';
  body += names.length ? `<ul class="plist">${names.map((n, i) => `<li><div class="t"><b>${esc(n)}</b><small>${esc(fmt(P[n].at))} · ${docCount(P[n].doc)} elementi${P[n].doc && Array.isArray(P[n].doc.pages) && P[n].doc.pages.length > 1 ? ` · ${P[n].doc.pages.length} fogli` : ''}</small></div><button class="pbtn" data-open="${i}">Apri</button><button class="pbtn danger" data-del="${i}" title="Elimina dal browser" aria-label="Elimina ${esc(n)}">${ICON.del}</button></li>`).join('')}</ul>` : '<p class="empty">Nessuno schema salvato. Usa File › Salva nel browser.</p>';
  body += '<h3 class="mh3">Da file</h3><div class="acts"><button class="pbtn" data-imp>Importa file .json</button></div>';
  const m = modal('Apri schema', body);
  $$('[data-open]', m).forEach(b => b.onclick = () => { const n = names[+b.dataset.open]; closeModal(); replaceGuard(() => { try { loadDoc(P[n].doc, `Aperto “${n}”.`); } catch (e) { toast(e.message, 'err'); } }); });
  $$('[data-del]', m).forEach(b => b.onclick = () => {
    const n = names[+b.dataset.del];
    confirmBox('Eliminare dal browser?', `Lo schema “${n}” verrà rimosso da questo browser.`, 'Elimina', () => { const Q = projects(); delete Q[n]; LS.set('elettrosim.projects', JSON.stringify(Q)); toast('Eliminato.'); openDialog(); });
  });
  $('[data-imp]', m).onclick = () => { closeModal(); $('#fileIn').click(); };
  const lg = $('[data-login]', m); if (lg) lg.onclick = () => { closeModal(); cloudSignIn(); };
  if (CLOUD.user) fillCloudList(m);
}
async function fillCloudList(m) {
  const box = $('#cloudList', m); if (!box) return;
  let L;
  try { L = await cloudList(); } catch (e) { box.innerHTML = '<p class="note bad">Impossibile leggere gli schemi online. Controlla la connessione e riprova.</p>'; return; }
  if (!box.isConnected) return;
  const fmt = t => { try { return new Date(t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
  box.innerHTML = L.length ? `<ul class="plist">${L.map((x, i) => `<li><div class="t"><b>${esc(x.name)}${x.id === CLOUD.id ? ' <small>(aperto)</small>' : ''}</b><small>${esc(fmt(x.at))} · ${x.n || 0} elementi${x.pages > 1 ? ` · ${x.pages} fogli` : ''}</small></div><button class="pbtn" data-copen="${i}">Apri</button><button class="pbtn danger" data-cdel="${i}" title="Elimina dall’account" aria-label="Elimina ${esc(x.name)}">${ICON.del}</button></li>`).join('')}</ul>` : '<p class="empty">Nessuno schema nel tuo account. Usa File › Salva nel mio account.</p>';
  $$('[data-copen]', box).forEach(b => b.onclick = () => {
    const x = L[+b.dataset.copen]; closeModal();
    replaceGuard(() => { try { loadDoc(JSON.parse(x.data), `Aperto “${x.name}” dal tuo account.`); setCloudId(x.id); } catch (e) { toast('Lo schema online è danneggiato.', 'err'); } });
  });
  $$('[data-cdel]', box).forEach(b => b.onclick = () => {
    const x = L[+b.dataset.cdel];
    confirmBox('Eliminare dall’account?', `Lo schema “${x.name}” verrà eliminato dal tuo account su tutti i dispositivi.`, 'Elimina', async () => {
      try { await cloudDelete(x.id); if (x.id === CLOUD.id) setCloudId(null); toast('Eliminato.'); } catch (e) { toast('Eliminazione non riuscita.', 'err'); }
      openDialog();
    });
  });
}
function importFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let d;
    try { d = JSON.parse(String(r.result)); } catch (e) { toast('Il file non è un JSON valido.', 'err'); return; }
    replaceGuard(() => { try { loadDoc(d, `Importato “${file.name}”.`); } catch (e) { toast(e.message, 'err'); } });
  };
  r.onerror = () => toast('Impossibile leggere il file.', 'err');
  r.readAsText(file);
}
function onImageFile(file) {
  const id = ui.replaceImg; ui.replaceImg = null;
  if (!id) { importImage(file); return; }
  const c = cmap().get(id); if (!c || !file) return;
  if (file.size > 3 * 1024 * 1024) { toast('Immagine troppo grande (massimo 3 MB).', 'err'); return; }
  const r = new FileReader();
  r.onload = () => { const src = String(r.result), img = new Image(); img.onload = () => { c.props.src = src; const w = +c.props.w || 160; c.props.h = Math.max(10, Math.round(w * (img.naturalHeight || 1) / (img.naturalWidth || 1))); commit(); }; img.onerror = () => toast('Formato di immagine non riconosciuto.', 'err'); img.src = src; };
  r.readAsDataURL(file);
}
