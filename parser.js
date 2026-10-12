// Pit Wall parser — Team Principal save (season*.json) -> Pit Wall SEASONS
// Browser + Node uyumlu (UMD).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PitWallParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  // Season 1'in takvim yılı. Kullanıcı upload ekranından değiştirir;
  // diğer sezonlar startYear + seasonNo - 1 olarak dizilir.
  var START_YEAR = 2001;
  function asYear(seasonNo, startYear) {
    return (startYear || START_YEAR) + seasonNo - 1;
  }

  // --- nationality (game) -> ISO country code (Pit Wall 'nat' / 'cc') ---
  var NAT = {
    afghan: 'af', albanian: 'al', algerian: 'dz', american: 'us', andorran: 'ad',
    angolan: 'ao', argentine: 'ar', armenian: 'am',     australian: 'au', austrian: 'at', azerbaijani: 'az',
    bahamian: 'bs', bahraini: 'bh', bangladeshi: 'bd', barbadian: 'bb', belarusian: 'by',
    belgian: 'be', belizean: 'bz', beninese: 'bj', bolivian: 'bo', bosnian: 'ba',
    botswanan: 'bw', brazilian: 'br', british: 'gb', bruneian: 'bn', bulgarian: 'bg',
    burkinabe: 'bf', cambodian: 'kh', cameroonian: 'cm', canadian: 'ca', cape_verdean: 'cv',
    chadian: 'td', chilean: 'cl', chinese: 'cn', colombian: 'co', congolese: 'cg',
    costa_rican: 'cr', croatian: 'hr', cuban: 'cu', cypriot: 'cy', czech: 'cz',
    danish: 'dk', dominican: 'do', dutch: 'nl', ecuadorian: 'ec', egyptian: 'eg',
    emirati: 'ae', english: 'gb', estonian: 'ee', ethiopian: 'et', fijian: 'fj',
    filipino: 'ph', finnish: 'fi', french: 'fr', georgian: 'ge', german: 'de',
    ghanaian: 'gh', greek: 'gr', grenadian: 'gd', guatemalan: 'gt', guyanese: 'gy',
    haitian: 'ht', honduran: 'hn', hong_konger: 'hk', hungarian: 'hu', icelandic: 'is',
    indian: 'in', indonesian: 'id', international: 'xx', iranian: 'ir', iraqi: 'iq',
    irish: 'ie', israeli: 'il', italian: 'it', ivorian: 'ci', jamaican: 'jm',
    japanese: 'jp', jordanian: 'jo', kazakh: 'kz', kenyan: 'ke', kuwaiti: 'kw',
    latvian: 'lv', lebanese: 'lb', liberian: 'lr', libyan: 'ly', liechtensteiner: 'li',
    lithuanian: 'lt', malaysian: 'my', maltese: 'mt', mexican: 'mx', moldovan: 'md',
    monegasque: 'mc', mongolian: 'mn', montenegrin: 'me', moroccan: 'ma', mozambican: 'mz',
    namibian: 'na', nepalese: 'np', new_zealander: 'nz', nigerian: 'ng', norwegian: 'no',
    omani: 'om', pakistani: 'pk', panamanian: 'pa', paraguayan: 'py', peruvian: 'pe',
    polish: 'pl', portuguese: 'pt', qatari: 'qa', romanian: 'ro', russian: 'ru',
    rwandan: 'rw', salvadoran: 'sv', san_marinese: 'sm', saudi: 'sa', scottish: 'gb',
    serbian: 'rs', singaporean: 'sg', slovak: 'sk', slovenian: 'si', south_african: 'za',
    south_korean: 'kr', spanish: 'es', sri_lankan: 'lk', swedish: 'se', swiss: 'ch',
    syrian: 'sy', taiwanese: 'tw', thai: 'th', trinidadian: 'tt', tunisian: 'tn',
    turkish: 'tr', ugandan: 'ug', ukrainian: 'ua', uruguayan: 'uy', uzbek: 'uz',
    venezuelan: 've', vietnamese: 'vn', welsh: 'gb', zimbabwean: 'zw'
  };

  // --- track code -> {name, cc} ---
  // Kısa kodlar (ist, mel...) + tam isimler (Melbourne, Monaco...) desteklenir.
  var TRACKS = {
    ist: ['Istanbul', 'tr'], mel: ['Melbourne', 'au'], gvi: ['Geneva', 'ch'],
    cat: ['Catalunya', 'es'], mon: ['Monaco', 'mc'], mia: ['Miami', 'us'],
    sil: ['Silverstone', 'gb'], hun: ['Hungaroring', 'hu'], spa: ['Spa', 'be'],
    sin: ['Singapore', 'sg'], tex: ['Texas', 'us'], suz: ['Suzuka', 'jp'],
    mza: ['Monza', 'it'], sak: ['Sakhir', 'bh'], sau: ['Jeddah', 'sa'],
    abu: ['Abu Dhabi', 'ae'], int: ['Interlagos', 'br'], arg: ['Buenos Aires', 'ar'],
    nur: ['Nurburgring', 'de'], imo: ['Imola', 'it'], mag: ['Magny-Cours', 'fr'],
    hoc: ['Hockenheim', 'de'], est: ['Estoril', 'pt'], aus: ['Melbourne', 'au'],
    bak: ['Baku', 'az'], bra: ['Interlagos', 'br'], bud: ['Hungaroring', 'hu'],
    canada: ['Montreal', 'ca'], chi: ['Shanghai', 'cn'], cot: ['Texas', 'us'],
    fra: ['Paul Ricard', 'fr'], ger: ['Hockenheim', 'de'], jap: ['Suzuka', 'jp'],
    mex: ['Mexico City', 'mx'], mxc: ['Mexico City', 'mx'], mtl: ['Montreal', 'ca'],
    mnz: ['Monza', 'it'], ned: ['Zandvoort', 'nl'], por: ['Portimao', 'pt'],
    prc: ['Paul Ricard', 'fr'], rbr: ['Red Bull Ring', 'at'], ric: ['Ricard', 'fr'],
    rio: ['Rio', 'br'], sep: ['Sepang', 'my'], sgp: ['Singapore', 'sg'],
    sha: ['Shanghai', 'cn'], soc: ['Sochi', 'ru'], spi: ['Spielberg', 'at'],
    tha: ['Buriram', 'th'], usa: ['Austin', 'us'], val: ['Valencia', 'es'],
    yeo: ['Yeongam', 'kr'], afr: ['Kyalami', 'za'], swi: ['Bremgarten', 'ch'],
    mlb: ['Melbourne', 'au'], mdr: ['Madrid', 'es']
  };
  // Tam isimle gelen pistler (yeni sezonlar): ismin kendisi + tahmini ülke.
  var TRACK_NAMES = {
    Melbourne: ['Melbourne', 'au'], Monaco: ['Monaco', 'mc'], Silverstone: ['Silverstone', 'gb'],
    Hungaroring: ['Hungaroring', 'hu'], Spa: ['Spa', 'be'], SpaFranchorchamps: ['Spa', 'be'],
    Singapore: ['Singapore', 'sg'], Suzuka: ['Suzuka', 'jp'], Sakhir: ['Sakhir', 'bh'],
    Jeddah: ['Jeddah', 'sa'], AbuDhabi: ['Abu Dhabi', 'ae'], AbuDhabi2021: ['Abu Dhabi', 'ae'],
    Interlagos: ['Interlagos', 'br'], Catalunya: ['Catalunya', 'es'], Catalunya2021: ['Catalunya', 'es'],
    Catalunya2023: ['Catalunya', 'es'], Miami: ['Miami', 'us'], Istanbul: ['Istanbul', 'tr'],
    Imola: ['Imola', 'it'], Montreal: ['Montreal', 'ca'], Monza: ['Monza', 'it'],
    Monza55: ['Monza', 'it'], Monza57: ['Monza', 'it'], Baku: ['Baku', 'az'],
    COTA: ['Texas', 'us'], Hockenheim: ['Hockenheim', 'de'], Estoril: ['Estoril', 'pt'],
    Jerez: ['Jerez', 'es'], Lusail: ['Lusail', 'qa'], Sepang: ['Sepang', 'my'],
    RedBullRing: ['Red Bull Ring', 'at'], PaulRicard: ['Paul Ricard', 'fr'],
    MexicoCity: ['Mexico City', 'mx'], Mexico: ['Mexico City', 'mx'], LasVegas: ['Las Vegas', 'us'],
    Zandvoort: ['Zandvoort', 'nl'], Zanvoort: ['Zandvoort', 'nl'], Algarve: ['Portimao', 'pt'],
    Mugello: ['Mugello', 'it'], Adelaide: ['Adelaide', 'au'], Hanoi: ['Hanoi', 'vn'],
    Madrid: ['Madrid', 'es'], CrownCity: ['Crown City', 'us'], Coliseum: ['Coliseum', 'us'],
    Ironsville: ['Ironsville', 'us'], Indianapolis: ['Indianapolis', 'us'], Phoenix: ['Phoenix', 'us'],
    BuenosAires: ['Buenos Aires', 'ar'], BuenosAires54: ['Buenos Aires', 'ar'],
    Jacarepagua: ['Jacarepagua', 'br'], AinDiab: ['Ain Diab', 'ma'], Aintree: ['Aintree', 'gb'],
    AVUS: ['AVUS', 'de'], Boavista: ['Boavista', 'pt'], Bremgarten: ['Bremgarten', 'ch'],
    Monsanto: ['Monsanto', 'pt'], MonteCarlo: ['Monaco', 'mc'], Monaco55: ['Monaco', 'mc']
  };

  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '').slice(0, 12) || 't';
  }
  // Same normalization as build_assets.py (manifest keys + logo lookup).
  function normName(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  // Country code -> game flag basename (first nationality using it; 'british' wins for gb).
  var CC_FLAG = {};
  Object.keys(NAT).forEach(function (n) { var cc = NAT[n]; if (!CC_FLAG[cc]) CC_FLAG[cc] = n; });
  function ccFlag(cc) { return CC_FLAG[String(cc || '').toLowerCase()] || null; }
  function rgbToHex(rgb) {
    if (!Array.isArray(rgb) || rgb.length < 3) return null;
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return v.toString(16).padStart(2, '0'); }
    return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
  }
  function shortName(name) {
    var generic = { team: 1, racing: 1, motorsport: 1, motorsports: 1, f1: 1, gp: 1, formula: 1, Scuderia: 1 };
    var parts = String(name || '').split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 12);
    var keep = parts.filter(function (p) { return !generic[p] && !generic[p.toLowerCase()]; });
    if (!keep.length) keep = parts;
    if (keep.length === 1) return keep[0].slice(0, 12);
    // "Ravenwest Motorsport" -> "Ravenwest", "AF Corse" -> "AF Corse"
    if (keep.length >= 2 && keep[0].length <= 3) return (keep[0] + ' ' + keep[1]).slice(0, 14);
    return keep[0].slice(0, 12);
  }
  function trackInfo(code) {
    if (!code) return { code: 'xxx', name: 'Unknown', cc: 'xx' };
    if (TRACKS[code]) return { code: code.toLowerCase(), name: TRACKS[code][0], cc: TRACKS[code][1] };
    var low = String(code).toLowerCase();
    if (TRACKS[low]) return { code: low, name: TRACKS[low][0], cc: TRACKS[low][1] };
    if (TRACK_NAMES[code]) return { code: low, name: TRACK_NAMES[code][0], cc: TRACK_NAMES[code][1] };
    // "Melbourne" gibi direkt isimler
    var pretty = String(code).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
    pretty = pretty.charAt(0).toUpperCase() + pretty.slice(1);
    return { code: low.slice(0, 3), name: pretty, cc: 'xx' };
  }
  function normPos(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    var s = String(v).trim();
    if (/^ret/i.test(s) || /^dnf/i.test(s) || /^dsq/i.test(s) || /^dns/i.test(s)) return 'R';
    if (/^dnq/i.test(s) || /^dnpq/i.test(s)) return 'DNQ';
    var n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }
  function isNonRace(code) {
    if (!code) return true;
    var c = String(code).toLowerCase();
    return c === 'test' || c === 'private';
  }

  function seasonNoOf(data, filename) {
    var seasonNo = (data && data.season_no) || null;
    if (!seasonNo && filename) {
      var m = /season\s*0*(\d+)/i.exec(filename);
      if (m) seasonNo = parseInt(m[1], 10);
    }
    return seasonNo || 1;
  }

  /* Ortak sezon kurucu. cfg:
     {seasonNo, schedule, results, teamsObj, constrPts, driverPts, statTeam,
      natByName, natNameByName, part, scoring, engineFallback, filename, hist} */
  function buildSeason(cfg) {
    var seasonNo = cfg.seasonNo;
    var schedule = Array.isArray(cfg.schedule) ? cfg.schedule : [];
    var calCodes = schedule.filter(function (c) { return c && !isNonRace(c); });
    var results = Array.isArray(cfg.results) ? cfg.results : [];
    var completed = results.length;
    var total = Math.max(calCodes.length, completed);
    // Takvimde eksik varsa yarış sonuçlarındaki pistleri kullan
    var roundCodes = calCodes.slice();
    for (var i = 0; i < completed; i++) {
      var rt = results[i] && results[i].track;
      if (!roundCodes[i] && rt) roundCodes[i] = rt;
    }
    if (!roundCodes.length) {
      roundCodes = results.map(function (r) { return r.track; });
      total = roundCodes.length;
    }
    var scoring = (Array.isArray(cfg.scoring) && cfg.scoring.length) ? cfg.scoring.slice() : POINTS.slice();

    // --- teams ---
    var teamsObj = cfg.teamsObj || {};
    var constrPts = cfg.constrPts || {};
    var engineFallback = cfg.engineFallback || {};
    var teamNames = Object.keys(teamsObj);
    // Yarışlara katılmış ama teams'te olmayan takımlar için ekle
    results.forEach(function (r) {
      var dt = r.driver_teams || {};
      Object.keys(dt).forEach(function (dn) {
        var tn = dt[dn];
        if (tn && teamNames.indexOf(tn) < 0) teamNames.push(tn);
      });
    });
    var teams = teamNames.map(function (tn, idx) {
      var t = teamsObj[tn] || {};
      var id = slug(tn);
      var bg = rgbToHex(t.color_rgb) || rgbToHex(t.secondary_color_rgb) || '#888888';
      var o = {
        id: id,
        name: tn,
        nameNorm: normName(tn),
        short: shortName(tn),
        engine: t.engine || t.engine_supplier || (t.engine_contract && t.engine_contract.engine) || engineFallback[tn] || '',
        color: bg,
        fg: rgbToHex(t.text_color_rgb) || null,
        pace: (typeof t.previous_constructor_position === 'number') ? t.previous_constructor_position : (idx + 1)
      };
      if (typeof constrPts[tn] === 'number') o.pts = constrPts[tn];
      return o;
    });
    // id çakışması olursa sayıyla ayır
    var seen = {};
    teams.forEach(function (t) {
      if (seen[t.id]) { seen[t.id]++; t.id = t.id + seen[t.id]; }
      else seen[t.id] = 1;
    });
    var teamByName = {};
    teams.forEach(function (t) { teamByName[t.name] = t; });

    // --- drivers ---
    var natByName = cfg.natByName || {};
    var natNameByName = cfg.natNameByName || {};
    var statTeam = cfg.statTeam || {};
    var statPts = cfg.driverPts || {};
    var part = cfg.part || [];
    var nameSet = {};
    part.forEach(function (n) { nameSet[n] = 1; });
    Object.keys(statTeam).forEach(function (n) { nameSet[n] = 1; });
    Object.keys(statPts).forEach(function (n) { nameSet[n] = 1; });
    Object.keys(natByName).forEach(function (n) { if (part.length === 0) nameSet[n] = 1; });
    results.forEach(function (r) {
      var dr = r.drivers || {};
      Object.keys(dr).forEach(function (n) { nameSet[n] = 1; });
    });
    // son yarıştaki takım = güncel takım
    var lastTeam = {};
    results.forEach(function (r) {
      var dt = r.driver_teams || {};
      Object.keys(dt).forEach(function (n) { lastTeam[n] = dt[n]; });
    });

    var drivers = Object.keys(nameSet).sort().map(function (name) {
      var r = [];
      for (var k = 0; k < roundCodes.length; k++) {
        if (k < completed) {
          var cell = results[k].drivers ? results[k].drivers[name] : undefined;
          r.push(normPos(cell));
        } else r.push(null);
      }
      var teamName = lastTeam[name] || statTeam[name] || '';
      var teamId = teamByName[teamName] ? teamByName[teamName].id : slug(teamName);
      var o = { name: name, nat: natByName[name] || 'xx', natName: natNameByName[name] || '', team: teamId, teamName: teamName, r: r };
      if (typeof statPts[name] === 'number') o.pts = statPts[name];
      return o;
    });
    // Hiç yarışmamış hayalet pilotları ele (tüm r null ise ve katılım listesinde de yoksa)
    drivers = drivers.filter(function (d) {
      var any = d.r.some(function (v) { return v !== null; });
      return any || part.indexOf(d.name) >= 0;
    });

    // --- rounds ---
    var rounds = roundCodes.map(function (code, k) {
      var info = trackInfo(code);
      var pole = (k < completed && results[k].pole && results[k].pole.driver) ? results[k].pole.driver : null;
      return { code: info.code.toUpperCase().slice(0, 3), name: info.name, cc: info.cc, pole: pole };
    });

    var out = {
      year: asYear(seasonNo, cfg.startYear),
      seasonNo: seasonNo,
      final: total > 0 && completed >= total,
      completed: completed,
      total: total,
      scoring: scoring,
      rounds: rounds,
      teams: teams,
      drivers: drivers,
      _source: cfg.filename || ''
    };
    if (cfg.hist) out._hist = true;
    return out;
  }

  function natMaps(driverList, driverHistory) {
    var natByName = {}, natNameByName = {};
    (driverList || []).forEach(function (d) {
      if (d && d.name) {
        var key = String(d.nationality || '').toLowerCase();
        natByName[d.name] = NAT[key] || 'xx';
        // raw game key -> flags/<key>.png (exact game asset name)
        natNameByName[d.name] = key;
      }
    });
    // Emekli/ayrılmış pilotlar için driver_history yedeği
    Object.keys(driverHistory || {}).forEach(function (n) {
      if (natByName[n]) return;
      var h = driverHistory[n] || {};
      var key = String(h.nationality || '').toLowerCase();
      if (!key) return;
      natByName[n] = NAT[key] || 'xx';
      natNameByName[n] = key;
    });
    return { natByName: natByName, natNameByName: natNameByName };
  }

  function parseSeasonFile(data, filename, startYear) {
    var seasonNo = seasonNoOf(data, filename);
    var maps = natMaps(data.drivers, data.driver_history);
    var statTeam = {}, statPts = {};
    var stats = data.season_driver_stats || {};
    Object.keys(stats).forEach(function (n) {
      if (stats[n] && stats[n].team) statTeam[n] = stats[n].team;
      // Oyunun kendi puan toplamı (pole/hızlı tur bonusları dahil) varsa sakla —
      // tablo oyundakiyle birebir eşleşsin diye standings() bunu tercih eder.
      if (stats[n] && typeof stats[n].points === 'number') statPts[n] = stats[n].points;
    });
    return buildSeason({
      seasonNo: seasonNo,
      startYear: startYear,
      schedule: data.schedule,
      results: data.race_results,
      teamsObj: data.teams,
      constrPts: data.constructors_points,
      driverPts: statPts,
      statTeam: statTeam,
      natByName: maps.natByName,
      natNameByName: maps.natNameByName,
      part: data.season_driver_participation,
      scoring: null,
      filename: filename || ''
    });
  }

  /* Save'in season_history girdisinden eski sezonu kur (tur tur sonuçlar dahil). */
  function parseHistoryEntry(entry, ctx, filename, startYear) {
    if (!entry || !entry.season_no) return null;
    var maps = natMaps(ctx.drivers, ctx.driverHistory);
    var driverPts = {}, statTeam = {};
    (entry.driver_table || []).forEach(function (row) {
      if (!row || !row.name) return;
      if (typeof row.points === 'number') driverPts[row.name] = row.points;
      if (row.team) statTeam[row.name] = row.team;
    });
    var constrPts = {};
    (entry.constructor_table || []).forEach(function (row) {
      if (!row || !row.team) return;
      if (typeof row.points === 'number') constrPts[row.team] = row.points;
    });
    return buildSeason({
      seasonNo: entry.season_no,
      startYear: startYear,
      schedule: entry.schedule,
      results: entry.race_results,
      teamsObj: entry.teams,
      constrPts: constrPts,
      driverPts: driverPts,
      statTeam: statTeam,
      natByName: maps.natByName,
      natNameByName: maps.natNameByName,
      part: [],
      scoring: entry.points_table,
      engineFallback: ctx.engines,
      filename: (filename || '') + ' [S' + entry.season_no + ' history]',
      hist: true
    });
  }

  function historyOf(data) {
    if (Array.isArray(data.season_history) && data.season_history.length) return data.season_history;
    var by = data.season_history_by_series;
    if (by && Array.isArray(by.main) && by.main.length) return by.main;
    return [];
  }

  function pointsFor(pos) {
    if (typeof pos !== 'number') return 0;
    return POINTS[pos - 1] || 0;
  }
  function standings(season) {
    var dl = season.drivers.map(function (d) {
      var wins = 0, calc = 0;
      d.r.forEach(function (v) { calc += pointsFor(v); if (v === 1) wins++; });
      // Oyunun bonuslu toplamı varsa onu göster (yoksa pozisyondan hesapla).
      var pts = (typeof d.pts === 'number') ? d.pts : calc;
      return { name: d.name, nat: d.nat, natName: d.natName || '', team: d.team, teamName: d.teamName, pts: pts, wins: wins };
    }).sort(function (a, b) { return b.pts - a.pts || b.wins - a.wins || a.name.localeCompare(b.name); });
    var tmap = {};
    season.teams.forEach(function (t) { tmap[t.id] = { id: t.id, name: t.name, nameNorm: t.nameNorm || normName(t.name), short: t.short, pts: 0, wins: 0, color: t.color, fg: t.fg || null, _ov: (typeof t.pts === 'number') ? t.pts : null }; });
    dl.forEach(function (d) {
      var t = tmap[d.team];
      if (!t) { t = tmap[d.team] = { id: d.team, name: d.teamName || d.team, nameNorm: normName(d.teamName || d.team), short: shortName(d.teamName || d.team), pts: 0, wins: 0, color: '#888', _ov: null }; }
      if (d.wins) t.wins += d.wins;
    });
    // Takım puanı: oyunun constructors_points'u varsa o, yoksa pilot toplamı.
    var tl = Object.keys(tmap).map(function (k) {
      var t = tmap[k];
      if (t._ov === null) {
        t.pts = dl.filter(function (d) { return d.team === k; }).reduce(function (a, d) { return a + d.pts; }, 0);
      } else t.pts = t._ov;
      delete t._ov;
      return t;
    })
      .sort(function (a, b) { return b.pts - a.pts || b.wins - a.wins || a.name.localeCompare(b.name); });
    return { drivers: dl, teams: tl };
  }

  // Birden fazla dosyayı sezonlara çevir: güncel sezon + season_history'deki eski
  // sezonlar. Aynı sezonun tekrarı varsa en dolu olanı tut.
  // opts: başlangıç yılı (sayı) veya {startYear}. Verilmezse START_YEAR kullanılır.
  function parseFiles(files, opts) {
    // files: [{name, data}]
    var startYear = (opts && typeof opts === 'object') ? opts.startYear : opts;
    startYear = parseInt(startYear, 10) || START_YEAR;
    var bySeason = {};
    function put(s) {
      if (!s || !s.seasonNo) return;
      var prev = bySeason[s.seasonNo];
      if (!prev || (s.completed || 0) > (prev.completed || 0)) bySeason[s.seasonNo] = s;
    }
    files.forEach(function (f) {
      try {
        put(parseSeasonFile(f.data, f.name, startYear));
        var engines = {};
        Object.keys((f.data && f.data.teams) || {}).forEach(function (tn) {
          var t = f.data.teams[tn] || {};
          engines[tn] = t.engine || t.engine_supplier || (t.engine_contract && t.engine_contract.engine) || '';
        });
        var ctx = { drivers: f.data.drivers, driverHistory: f.data.driver_history, engines: engines };
        historyOf(f.data).forEach(function (entry) {
          try { put(parseHistoryEntry(entry, ctx, f.name, startYear)); } catch (e) { /* atla */ }
        });
      } catch (e) { /* bozuk dosyayı atla */ }
    });
    return Object.keys(bySeason).map(Number).sort(function (a, b) { return a - b; })
      .map(function (k) { return bySeason[k]; });
  }

  // ---- custom scoring helpers (settings) ----  // "25,18,15,..." metnini doğrula -> {ok:true, arr} / {ok:false, error}
  function validScoring(str) {
    var parts = String(str || '').split(/[,;\s]+/).filter(function (x) { return x !== ''; });
    if (!parts.length) return { ok: false, error: 'Enter at least one points value.' };
    if (parts.length < 2) return { ok: false, error: 'Enter at least two values (win + second place).' };
    if (parts.length > 24) return { ok: false, error: 'Maximum 24 positions.' };
    var arr = [];
    for (var i = 0; i < parts.length; i++) {
      var n = parseInt(parts[i], 10);
      if (isNaN(n) || n < 0 || n > 500) return { ok: false, error: 'Values must be numbers 0–500.' };
      if (i && n > arr[i - 1]) return { ok: false, error: 'Values must not increase down the order.' };
      arr.push(n);
    }
    return { ok: true, arr: arr };
  }
  // Taze parse edilmiş sezonlardan orijinal skor tablolarını topla {seasonNo: [...]}
  function captureOrig(seasons) {
    var out = {};
    (seasons || []).forEach(function (s) {
      if (s && s.seasonNo && Array.isArray(s.scoring) && s.scoring.length) out[s.seasonNo] = s.scoring.slice();
    });
    return out;
  }
  // Özel tabloyu tüm sezonlara uygula (yerinde değiştirir, aynı diziyi döndürür)
  function applyScoring(seasons, arr) {
    (seasons || []).forEach(function (s) {
      if (s) s.scoring = arr.slice();
    });
    return seasons;
  }
  var PRESETS = {
    modern: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    extended: [25, 18, 15, 12, 10, 8, 6, 5, 4, 3, 2, 1],
    classic8: [10, 8, 6, 5, 4, 3, 2, 1],
    classic6: [10, 6, 4, 3, 2, 1]
  };

  // Logo manifestinde takım ara: birebir eşleşme, sonra startswith, sonra contains.
  // manifest: {normDosyaAdı: dosyaAdı} — build_assets.py üretir.
  function findLogo(norm, manifest) {
    if (!norm || !manifest) return null;
    if (manifest[norm]) return manifest[norm];
    var keys = Object.keys(manifest), i, k;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (k.indexOf(norm) === 0 || norm.indexOf(k) === 0) return manifest[k];
    }
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (k.indexOf(norm) >= 0 || norm.indexOf(k) >= 0) return manifest[k];
    }
    return null;
  }

  return { POINTS: POINTS, START_YEAR: START_YEAR, PRESETS: PRESETS, validScoring: validScoring, captureOrig: captureOrig, applyScoring: applyScoring, findLogo: findLogo, parseSeasonFile: parseSeasonFile, parseFiles: parseFiles, standings: standings, trackInfo: trackInfo, normName: normName, ccFlag: ccFlag };
});
