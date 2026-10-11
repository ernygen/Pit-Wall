/* Pit Wall uploader — Team Principal save files -> SEASONS -> persist -> reload.
   Works alongside the original Pit Wall app code (which owns rendering).
   Depends on: parser.js (window.PitWallParser), assets.js (window.PITWALL_FLAGS/LOGOS). */
(function () {
'use strict';
var P = window.PitWallParser;
var FLAGS = window.PITWALL_FLAGS || [];
var LOGOS = window.PITWALL_LOGOS || [];
var LS_KEY = 'pitwall-data';
var YEAR_KEY = 'pitwall-startyear';
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
function badgesFor(seasons) {
  var out = {}, seen = {};
  seasons.forEach(function (S) {
    (S.teams || []).forEach(function (t) {
      if (!t || !t.id || seen[t.id]) return;
      seen[t.id] = 1;
      var key = t.nameNorm || P.normName(t.name);
      if (key && LOGOS[key]) out[t.id] = 'logos/' + LOGOS[key];
    });
  });
  return out;
}
function persist(seasons, startYear) {
  var data = { v: 1, startYear: startYear || storedYear(), seasons: seasons, badges: badgesFor(seasons), gencss: genCSS(seasons) };
  lsSet(data);
  idb.set(LS_KEY, data);
  return data;
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
    var merged = window.SEASONS || [];
    backups.forEach(function (b) {
      var arr = Array.isArray(b.data) ? b.data : b.data.seasons;
      merged = mergeSeasons(merged, arr);
    });
    if (saves.length) merged = mergeSeasons(merged, P.parseFiles(saves, startYear));
    if (!merged.length) {
      msg('<div class="err-box">No valid save found. Make sure you dropped <b>season*.json</b> files or a backup JSON.</div>');
      return;
    }
    merged = reyear(merged, startYear);
    persist(merged, startYear);
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
  /* data was restored synchronously — the app already booted into it */
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
