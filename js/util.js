/* ElettroSim · Utilità comuni, primitive SVG e potenziali elettrici. */
'use strict';
const G = 10;
let REDUCED = false;
try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { REDUCED = false; }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const snap = v => Math.round(v / G) * G;
const key = n => String(n ?? '').trim().toUpperCase();
let _uidN = 0;
const uid = p => p + Math.random().toString(36).slice(2, 7) + (++_uidN).toString(36);
const r1 = v => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ln = (x1, y1, x2, y2, c) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"${c ? ` class="${c}"` : ''}/>`;
const pa = (d, c, extra) => `<path d="${d}"${c ? ` class="${c}"` : ''}${extra || ''}/>`;
const ci = (x, y, r, c, extra) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}"${c ? ` class="${c}"` : ''}${extra || ''}/>`;
const re = (x, y, w, h, c, extra) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${c ? ` class="${c}"` : ''}${extra || ''}/>`;
const tx = (x, y, t, size, extra) => `<text x="${r1(x)}" y="${r1(y)}" font-size="${size || 7}" text-anchor="middle" dominant-baseline="central" class="stx"${extra || ''}>${esc(t)}</text>`;

/* ---------- electrical potentials ---------- */
const POTS = [];
function mkPot(name, sys, kind, ph, owner) { const id = POTS.length; POTS.push({ id, name, sys, kind, ph, owner }); return id; }
const PT = {
  L1: mkPot('L1', 'mains', 'L', 0), L2: mkPot('L2', 'mains', 'L', 1), L3: mkPot('L3', 'mains', 'L', 2),
  N: mkPot('N', 'mains', 'N'), PE: mkPot('PE', 'mains', 'PE'), P: mkPot('+24V', 'dc', 'P'), M: mkPot('0V', 'dc', 'M'),
};
const STATIC_POTS = POTS.length;
function resetPots() { POTS.length = STATIC_POTS; }
const POT_TXT = { L1: 'L1', L2: 'L2', L3: 'L3', N: 'N', PE: 'PE', P: '+24V', M: '0V' };
const isGnd = id => { const k = POTS[id].kind; return k === 'N' || k === 'PE' || k === 'M'; };
function potConflict(a, b) {
  if (a === b) return false;
  const A = POTS[a], B = POTS[b];
  if (isGnd(a) && isGnd(b)) return false;
  const iso = p => p.sys !== 'mains' && p.sys !== 'dc';
  if ((A.kind === 'PE' && iso(B)) || (B.kind === 'PE' && iso(A))) return false;
  return true;
}
function potPair(a, b) {
  if (a === b) return false;
  const A = POTS[a], B = POTS[b];
  if (A.sys !== B.sys) return false;
  if (A.sys === 'mains') return !((A.kind === 'N' && B.kind === 'PE') || (A.kind === 'PE' && B.kind === 'N'));
  if (A.sys === 'dc') return (A.kind === 'P' && B.kind === 'M') || (A.kind === 'M' && B.kind === 'P');
  return true;
}
/* tensioni (valori in volt): la rete ha una tensione concatenata, la continua un unico valore; i secondari
   dei trasformatori e le uscite dei variatori hanno la loro. VSYS viene aggiornato all’avvio della simulazione. */
const VSYS = { vc: 400, vdc: 24, own: {} };
const VLN_STD = { 400: 230, 690: 400, 230: 133, 208: 120, 480: 277, 380: 220 };
const vLN = vc => VLN_STD[vc] || Math.round(vc / Math.sqrt(3));
function pairVolts(a, b) {
  if (!potPair(a, b)) return 0;
  const A = POTS[a], B = POTS[b];
  if (A.sys === 'dc') return VSYS.vdc;
  const o = A.sys === 'mains' ? { ll: VSYS.vc, ln: vLN(VSYS.vc) } : VSYS.own[A.owner];
  if (!o) return null;
  return A.kind === 'L' && B.kind === 'L' ? o.ll : o.ln;
}
function voltsOf(A, B) {
  let best = 0, unk = false;
  for (const a of A) for (const b of B) { const v = pairVolts(a, b); if (v == null) unk = true; else if (v > best) best = v; }
  return best || (unk ? null : 0);
}
const potTxt = p => p === 'P' ? `+${fmtV(doc.meta.vdc)}V` : POT_TXT[p] || p;
const fmtV = v => String(Math.round((+v || 0) * 10) / 10).replace('.', ',');
function voltOf(A, B) { for (const a of A) for (const b of B) if (potPair(a, b)) return true; return false; }
function hasConflict(arr) { for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) if (potConflict(arr[i], arr[j])) return true; return false; }
const potLevel = id => { const k = POTS[id].kind; return k === 'P' || k === 'L' ? 2 : 0; };
function netClass(arr) {
  if (!arr || !arr.length) return 'dead';
  if (hasConflict(arr)) return 'short';
  if (arr.some(id => { const k = POTS[id].kind; return k === 'L' || k === 'P'; })) return 'live';
  if (arr.some(id => POTS[id].kind === 'N' || POTS[id].kind === 'M')) return 'neu';
  return 'pe';
}
function potNames(arr) { return [...new Set((arr || []).map(id => POTS[id].name))].join(', '); }
const isHi = arr => !!(arr && arr.some(id => { const k = POTS[id].kind; return k === 'P' || k === 'L'; }));
