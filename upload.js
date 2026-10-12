/* Pit Wall uploader — Team Principal save files -> SEASONS -> persist -> reload.
   Works alongside the original Pit Wall app code (which owns rendering).
   Depends on: parser.js (window.PitWallParser), assets.js (window.PITWALL_FLAGS/LOGOS). */
(function () {
'use strict';
var P = window.PitWallParser;
var FLAGS = window.PITWALL_FLAGS || [];
var LS_KEY = 'pitwall-data';
var YEAR_KEY = 'pitwall-startyear';
var PACK_KEY = 'pitwall-logopack';
var PACKS = window.PITWALL_LOGO_PACKS || {};
var PACK_LIST = window.PITWALL_LOGO_PACK_LIST || [];
function defaultPack() { return PACK_LIST.indexOf('2026pfm') >= 0 ? '2026pfm' : (PACK_LIST[0] || ''); }
function effectivePack(explicit) {
  if (explicit && PACKS[explicit]) return explicit;
  var pref = null, d = null;
  try { pref = localStorage.getItem(PACK_KEY); } catch (e) {}
  if (pref && PACKS[pref]) return pref;
  try { d = lsGet(); } catch (e) {}
  if (d && d.logoPack && PACKS[d.logoPack]) return d.logoPack;
  return defaultPack();
}
function defaultYear() { return (window.PitWallParser && window.PitWallParser.START_YEAR) || 2001; }
function storedYear() {
  try {
    var d = lsGet();
    if (d && d.startYear) return d.startYear;
    var y = parseInt(localStorage.getItem(YEAR_KEY), 10);
    if (y >= 1900 && y <= 2100) return y;
  } catch (e) {}
  return defaultYear();
}
function readYearInput() {
  var el = document.getElementById('uw-year');
  var y = el ? parseInt(el.value, 10) : NaN;
  if (!(y >= 1900 && y <= 2100)) y = storedYear();
  try { localStorage.setItem(YEAR_KEY, String(y)); } catch (e) {}
  return y;
}

/* Country codes already covered by Pit Wall's embedded flag CSS — don't override those. */
var EMBEDDED_FLAGS = ['ae','at','au','be','bh','br','ca','ch','cn','co','de','es','fi','fr',
  'gb','hu','in','it','jp','mc','mx','my','nl','pl','ru','se','sg','sm','tr','us','ve'];

/* ---------------- storage ---------------- */
var idb = {
  open: function () {
    return new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('pitwall', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
  },
  get: function (k) {
    return this.open().then(function (db) {
      return new Promise(function (res, rej) {
        try {
          var t = db.transaction('kv').objectStore('kv').get(k);
          t.onsuccess = function () { res(t.result || null); };
          t.onerror = function () { rej(t.error); };
        } catch (e) { rej(e); }
      });
    });
  },
  set: function (k, v) {
    var self = this;
    return this.open().then(function (db) {
      return new Promise(function (res, rej) {
        try {
          var t = db.transaction('kv').objectStore('kv').put(v, k);
          t.onsuccess = function () { res(); };
          t.onerror = function () { rej(t.error); };
        } catch (e) { rej(e); }
      });
    }).catch(function () {});
  },
  del: function (k) {
    return this.open().then(function (db) {
      return new Promise(function (res) {
        try {
          var t = db.transaction('kv').objectStore('kv').delete(k);
          t.onsuccess = function () { res(); };
          t.onerror = function () { res(); };
        } catch (e) { res(); }
      });
    }).catch(function () {});
  }
};
function lsGet() { try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function lsSet(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
function lsDel() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

/* ---------------- derived assets ---------------- */
function fgFor(hex) {
  var h = String(hex || '').replace('#', '');
  if (h.length !== 6) return '#ffffff';
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.6 ? '#0b0f17' : '#ffffff';
}
/* Team-color bars (.tc-<id>) + extra flag classes (.fl-<cc>) for codes Pit Wall doesn't embed. */
function genCSS(seasons) {
  var css = '', seenT = {}, seenF = {};
  seasons.forEach(function (S) {
    (S.teams || []).forEach(function (t) {
      if (!t || !t.id || seenT[t.id]) return;
      seenT[t.id] = 1;
      var bg = t.color || '#888888';
      css += '.tc-' + t.id + '{--tc:' + bg + ';--tb:' + bg + ';--tf:' + (t.fg || fgFor(bg)) + '}\n';
    });
    var ccs = {};
    (S.drivers || []).forEach(function (d) { if (d.nat) ccs[d.nat] = 1; });
    (S.rounds || []).forEach(function (r) { if (r.cc) ccs[r.cc] = 1; });
    Object.keys(ccs).forEach(function (cc) {
      if (seenF[cc] || EMBEDDED_FLAGS.indexOf(cc) >= 0) return;
      seenF[cc] = 1;
      var f = P.ccFlag(cc);
      if (f && FLAGS.indexOf(f) >= 0) css += '.fl-' + cc + '{background-image:url("flags/' + f + '.png")}\n';
    });
  });
  return css;
}
function badgesFor(seasons, pack) {
  var man = PACKS[pack] || {};
  var out = {}, seen = {};
  seasons.forEach(function (S) {
    (S.teams || []).forEach(function (t) {
      if (!t || !t.id || seen[t.id]) return;
      seen[t.id] = 1;
      var key = t.nameNorm || P.normName(t.name);
      var file = P.findLogo(key, man);
      if (file) out[t.id] = 'logos/' + encodeURI(pack) + '/' + encodeURI(file);
    });
  });
  return out;
}
function persist(seasons, startYear, custom, orig, pack) {
  var m = {};
  try { m = lsGet() || {}; } catch (e) {}
  if (custom === undefined) custom = (m.customScoring === undefined ? null : m.customScoring);
  if (orig === undefined) orig = m.origScoring || {};
  if (pack === undefined) pack = effectivePack(m.logoPack);
  var data = { v: 2, startYear: startYear || storedYear(), customScoring: custom, origScoring: orig, logoPack: pack, seasons: seasons, badges: badgesFor(seasons, pack), gencss: genCSS(seasons) };
  lsSet(data);
  idb.set(LS_KEY, data);
  return data;
}
function meta() {
  var d = {};
  try { d = lsGet() || {}; } catch (e) {}
  return { custom: (d.customScoring === undefined ? null : d.customScoring), orig: d.origScoring || {}, pack: effectivePack(d.logoPack) };
}
/* Re-number every stored season from a new start year (S1 = year, S2 = year+1, …). */
function reyear(seasons, startYear) {
  (seasons || []).forEach(function (s) {
    if (s && s.seasonNo) s.year = startYear + s.seasonNo - 1;
  });
  return seasons;
}
function applyData(data) {
  window.SEASONS = (data && data.seasons) || [];
  window.BADGES = (data && data.badges) || {};
  var g = document.getElementById('gencss');
  if (g) g.textContent = (data && data.gencss) || '';
}
function mergeSeasons(oldS, fresh) {
  var map = {};
  (oldS || []).concat(fresh || []).forEach(function (s) {
    if (!s || !s.seasonNo) return;
    if (!map[s.seasonNo] || (s.completed || 0) > (map[s.seasonNo].completed || 0)) map[s.seasonNo] = s;
  });
  return Object.keys(map).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return map[k]; });
}

/* ---------------- upload view ---------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
window.showUploadHome = function () {
  var app = document.getElementById('app');
  if (!app) return;
  var n = (window.SEASONS || []).length;
  var tot = (window.SEASONS || []).reduce(function (a, s) { return a + (s.completed || 0); }, 0);
  var m = meta();
  var eff = m.custom || ((window.SEASONS || [])[0] && (window.SEASONS || [])[0].scoring) || (P.POINTS || [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
  app.innerHTML =
    '<section class="panel"><h2>Drop your save, get the table <small>Team Principal</small></h2>' +
    '<p class="muted">Drop your career\'s <code>season*.json</code> files below — e.g. ' +
    '<code>season1.json</code>, <code>season2.json</code>. Upload the seasons of ' +
    '<b>one career together</b>. Everything is processed locally in your browser.' +
    (n ? ' <b>' + n + ' season(s), ' + tot + ' races loaded.</b>' : '') + '</p>' +
    '<p class="muted">Default Steam location:<br><code>E:\\SteamLibrary\\steamapps\\common\\Team Principal A Racing Manager\\saves</code></p>' +
    '<div class="ctrl" style="margin-bottom:12px"><label class="lbl" for="uw-year">Season 1 starts in</label>' +
    '<input id="uw-year" type="number" min="1900" max="2100" step="1" value="' + storedYear() + '" style="width:110px;font:700 14px var(--fb);padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surf);color:var(--ink)">' +
    '<button class="btn ghost" id="uw-apply-year">Apply year</button>' +
    '<span class="muted" id="uw-year-hint">later seasons follow automatically</span></div>' +
    (PACK_LIST.length ? '<div class="ctrl"><label class="lbl" for="uw-logopack">Logo pack</label>' +
    '<select id="uw-logopack" style="flex:1;min-width:220px;font:700 14px var(--fb);padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surf);color:var(--ink)">' +
    PACK_LIST.map(function (p) { return '<option value="' + esc(p) + '"' + (p === meta().pack ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') +
    '</select><span class="muted">team badges are taken from this data pack</span></div>' : '') +
    '<div class="lbl" style="margin:14px 0 6px">Points system <span class="muted">recomputed for every season, from race positions</span></div>' +
    '<div class="ctrl" id="uw-presets">' +
    '<button class="btn ghost sm" data-p="modern">Modern Top 10</button>' +
    '<button class="btn ghost sm" data-p="extended">Extended Top 12</button>' +
    '<button class="btn ghost sm" data-p="classic8">Classic Top 8</button>' +
    '<button class="btn ghost sm" data-p="classic6">Classic Top 6</button></div>' +
    '<div class="ctrl"><input id="uw-points" spellcheck="false" autocomplete="off" value="' + esc(eff.join(',')) + '" style="flex:1;min-width:220px;font:700 14px var(--fb);padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surf);color:var(--ink)">' +
    '<button class="btn ghost" id="uw-apply-points">Apply table</button>' +
    '<button class="btn ghost" id="uw-reset-points">Reset</button></div>' +
    '<div class="muted" id="uw-points-msg"></div>' +
    '<div class="drop" id="uw-drop" role="button" tabindex="0" aria-label="Upload save files">' +
    '<div class="big">Drag &amp; drop files here</div>' +
    '<div class="small">or click to select season*.json files (several at once) — or a previously downloaded backup JSON</div>' +
    '<input type="file" id="uw-file" accept=".json,application/json" multiple hidden></div>' +
    '<div class="filelist" id="uw-filelist"></div><div id="uw-msg"></div>' +
    '<div class="ctrl" style="margin-top:12px">' +
    '<button class="btn ghost" id="uw-backup">Download backup</button>' +
    '<button class="btn ghost" id="uw-clear">Clear all data</button>' +
    (n ? '<button class="btn" id="uw-back">Back to standings</button>' : '') +
    '</div></section>' +
    '<section class="panel"><h2>Features <small>same as Pit Wall</small></h2>' +
    '<p class="muted">Home dashboard · Drivers · Teams · Transfers · Line-ups · Rounds · Calendar · ' +
    'Winners &amp; Podiums · Championship fight · Analysis · Recap · Engines · Records · Tracks · ' +
    'Head to head · Hall of Fame · Compare seasons · Projection — plus search (<kbd>/</kbd>), ' +
    'season switcher, light/dark theme, phone/PC view and PNG export on every page.</p></section>';
  var drop = document.getElementById('uw-drop'), file = document.getElementById('uw-file');
  drop.addEventListener('click', function () { file.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); }); });
  drop.addEventListener('drop', function (e) { handleFiles(e.dataTransfer.files); });
  file.addEventListener('change', function () { handleFiles(file.files); file.value = ''; });
  document.getElementById('uw-backup').addEventListener('click', downloadBackup);
  document.getElementById('uw-clear').addEventListener('click', function () {
    lsDel(); idb.del(LS_KEY); location.reload();
  });
  document.getElementById('uw-apply-year').addEventListener('click', function () {
    var y = readYearInput();
    var hint = document.getElementById('uw-year-hint');
    if ((window.SEASONS || []).length) {
      persist(reyear(window.SEASONS.slice(), y), y);
      location.reload();
    } else if (hint) {
      hint.textContent = 'saved — season 1 will start in ' + y;
    }
  });
  var lpSel = document.getElementById('uw-logopack');
  if (lpSel) lpSel.addEventListener('change', function () {
    var pack = effectivePack(lpSel.value);
    try { localStorage.setItem(PACK_KEY, pack); } catch (e) {}
    if ((window.SEASONS || []).length) {
      var mm0 = meta();
      persist(window.SEASONS.slice(), storedYear(), mm0.custom, mm0.orig, pack);
      location.reload();
    }
  });
  function pointsMsg(t) {
    var el = document.getElementById('uw-points-msg');
    if (el) el.textContent = t;
  }
  Array.prototype.forEach.call(document.querySelectorAll('#uw-presets button'), function (b) {
    b.addEventListener('click', function () {
      var p = (P.PRESETS || {})[b.getAttribute('data-p')];
      if (p) document.getElementById('uw-points').value = p.join(',');
    });
  });
  document.getElementById('uw-apply-points').addEventListener('click', function () {
    var v = P.validScoring(document.getElementById('uw-points').value);
    if (!v.ok) { pointsMsg(v.error); return; }
    if ((window.SEASONS || []).length) {
      P.applyScoring(window.SEASONS, v.arr);
      var mm = meta();
      persist(window.SEASONS.slice(), storedYear(), v.arr, mm.orig);
      location.reload();
    } else {
      var d = lsGet() || {};
      d.customScoring = v.arr;
      lsSet(d); idb.set(LS_KEY, d);
      pointsMsg('Saved — the table will apply when you upload save files.');
    }
  });
  document.getElementById('uw-reset-points').addEventListener('click', function () {
    var mm = meta();
    var seasons = window.SEASONS || [];
    if (seasons.length) {
      seasons.forEach(function (s) {
        if (s && s.seasonNo && mm.orig[s.seasonNo]) s.scoring = mm.orig[s.seasonNo].slice();
      });
      persist(seasons.slice(), storedYear(), null, mm.orig);
      location.reload();
    } else {
      var d = lsGet() || {};
      d.customScoring = null;
      lsSet(d); idb.set(LS_KEY, d);
      pointsMsg('Reset — original tables will be used.');
    }
  });
  var back = document.getElementById('uw-back');
  if (back) back.addEventListener('click', function () {
    try { location.hash = '#home'; } catch (e) {}
    if (window.render) window.render(); else location.reload();
  });
};

function msg(html) {
  var m = document.getElementById('uw-msg');
  if (m) m.innerHTML = html;
}
function downloadBackup() {
  var data = lsGet() || { v: 1, startYear: storedYear(), seasons: window.SEASONS || [], badges: window.BADGES || {}, gencss: '' };
  var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pitwall-backup.json';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function isBackup(o) {
  return o && ((Array.isArray(o.seasons) && o.seasons.length) || (Array.isArray(o) && o.length && o[0] && o[0].rounds));
}
function handleFiles(list) {
  if (!list || !list.length) return;
  msg('');
  var jobs = Array.prototype.map.call(list, function (f) {
    return f.text().then(function (txt) {
      try { return { name: f.name, data: JSON.parse(txt) }; }
      catch (e) { return { name: f.name, error: 'Could not parse JSON' }; }
    }).catch(function () { return { name: f.name, error: 'Could not read file' }; });
  });
  Promise.all(jobs).then(function (parsed) {
    var fl = document.getElementById('uw-filelist');
    if (fl) fl.innerHTML = parsed.map(function (p) {
      var ok = p.data && (p.data.race_results || p.data.schedule || isBackup(p.data));
      return '<div class="file"><b>' + esc(p.name) + '</b>' +
        (ok ? '<span class="ok">✓ ok</span>' : '<span class="err">✕ ' + esc(p.error || 'not a save file') + '</span>') + '</div>';
    }).join('');
    var backups = parsed.filter(function (p) { return p.data && isBackup(p.data) && !(p.data.race_results || p.data.schedule); });
    var saves = parsed.filter(function (p) { return p.data && (p.data.race_results || p.data.schedule); });
    var startYear = readYearInput();
    backups.forEach(function (b) {
      if (b.data && !Array.isArray(b.data) && b.data.startYear) startYear = b.data.startYear;
    });
    var mm = meta();
    var orig = mm.orig, custom = mm.custom;
    // Logo pack: explicit choice wins; otherwise the save's data_pack (first upload).
    var pref = null;
    try { pref = localStorage.getItem(PACK_KEY); } catch (e) {}
    var pack = (pref && PACKS[pref]) ? pref : null;
    if (!pack && saves.length) {
      var dp = saves[0].data && saves[0].data.data_pack;
      if (dp && PACKS[dp]) pack = dp;
    }
    if (!pack) pack = mm.pack;
    try { localStorage.setItem(PACK_KEY, pack); } catch (e2) {}
    var merged = window.SEASONS || [];
    backups.forEach(function (b) {
      var arr = Array.isArray(b.data) ? b.data : b.data.seasons;
      var bOrig = (!Array.isArray(b.data) && b.data.origScoring) || {};
      Object.keys(bOrig).forEach(function (k) { orig[k] = bOrig[k]; });
      (arr || []).forEach(function (s) {
        if (s && s.seasonNo && !orig[s.seasonNo] && Array.isArray(s.scoring)) orig[s.seasonNo] = s.scoring.slice();
      });
      merged = mergeSeasons(merged, arr);
    });
    if (saves.length) {
      var fresh = P.parseFiles(saves, startYear);
      var fOrig = P.captureOrig(fresh);
      Object.keys(fOrig).forEach(function (k) { orig[k] = fOrig[k]; });
      merged = mergeSeasons(merged, fresh);
    }
    if (!merged.length) {
      msg('<div class="err-box">No valid save found. Make sure you dropped <b>season*.json</b> files or a backup JSON.</div>');
      return;
    }
    merged = reyear(merged, startYear);
    if (custom) P.applyScoring(merged, custom);
    persist(merged, startYear, custom, orig, pack);
    location.reload();
  });
}

/* ---------------- boot ---------------- */
function addUploadBtn() {
  var tools = document.querySelector('.tools');
  if (!tools || document.getElementById('uploadBtn')) return;
  var b = document.createElement('button');
  b.className = 'tool'; b.id = 'uploadBtn'; b.textContent = 'Upload';
  b.setAttribute('aria-label', 'Upload save files');
  tools.insertBefore(b, tools.firstChild);
  b.addEventListener('click', function () {
    window.showUploadHome();
    try { window.scrollTo(0, 0); } catch (e) {}
  });
}
addUploadBtn();
if ((window.SEASONS || []).length) {
  /* data was restored synchronously — the app already booted into it.
     v1 stored badges used flat logos/ paths: rebuild them for the logo pack. */
  var dd = null;
  try { dd = lsGet(); } catch (e) {}
  if (dd && dd.v !== 2) {
    var pk = effectivePack(dd.logoPack);
    window.BADGES = badgesFor(window.SEASONS, pk);
    dd.v = 2; dd.seasons = window.SEASONS; dd.badges = window.BADGES;
    if (!dd.logoPack) dd.logoPack = pk;
    try { localStorage.setItem(PACK_KEY, pk); } catch (e2) {}
    lsSet(dd); idb.set(LS_KEY, dd);
  }
} else {
  idb.get(LS_KEY).then(function (data) {
    if (data && data.seasons && data.seasons.length) {
      lsSet(data);
      location.reload();
    } else {
      window.showUploadHome();
    }
  }).catch(function () { window.showUploadHome(); });
  setTimeout(function () {
    var app = document.getElementById('app');
    if (!(window.SEASONS || []).length && app && !app.innerHTML) window.showUploadHome();
  }, 2500);
}
})();
