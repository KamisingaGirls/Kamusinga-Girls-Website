
/* Assignments & Calendar.
   Staff edit a Google Sheet (two tabs: Assignments, Calendar) that is "Published to the web" as CSV.
   Paste the two published CSV links below. If a link is left empty, or Google can't be reached,
   the pages quietly fall back to the JSON files in assets/data/ (the old CMS data), so the
   pages never go blank. See GOOGLE_SHEET_SETUP.txt. */
(function () {

  /* ====== PASTE THE TWO PUBLISHED-CSV LINKS HERE (keep the quote marks) ====== */
  var SHEETS = {
    assignments: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgwFBJzyXgkJfKLp9-lqo489i3JoNsXkvthMDwZCDEB9qQtHr7-MKPGwp3fUOlnb6SvBvW2n0RNriW/pub?gid=1334790184&single=true&output=csv',   // e.g. 'https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv'
    calendar:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgwFBJzyXgkJfKLp9-lqo489i3JoNsXkvthMDwZCDEB9qQtHr7-MKPGwp3fUOlnb6SvBvW2n0RNriW/pub?gid=1115658666&single=true&output=csv'    // e.g. 'https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123456&single=true&output=csv'
  };
  var SITE_URL = 'https://www.moigirlskamusinga.net/calendar.html';
  var LOCATION = 'ACK Moi Girls High School Kamusinga, Kimilili, Bungoma County, Kenya';
  var TZ_OFFSET_HOURS = 3; // Kenya is UTC+3 all year (no daylight saving)

  /* ---------- small helpers ---------- */
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : str;
    return d.innerHTML;
  }
  function escAttr(str) {
    return esc(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  async function fetchJSON(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    return res.json();
  }
  async function fetchText(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    return res.text();
  }

  /* Minimal CSV parser (quotes, commas and line breaks inside cells). Returns array of row objects keyed by lower-cased header. */
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, '');
    var rows = [], row = [], cell = '', inQ = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
        else cell += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = ''; rows.push(row); row = [];
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).filter(function (r) {
      return r.some(function (v) { return v.trim() !== ''; });
    }).map(function (r) {
      var o = {};
      head.forEach(function (h, idx) { if (h) o[h] = (r[idx] || '').trim(); });
      return o;
    });
  }

  /* Accepts 2026-10-17, 17/10/2026 (day first, as in Kenya) or "17 Oct 2026". Returns 'YYYY-MM-DD' or ''. */
  function normDate(v) {
    v = String(v || '').trim();
    var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (m) {
      var a = +m[1], b = +m[2], day = a, mon = b;
      if (b > 12 && a <= 12) { day = b; mon = a; }   // clearly month/day/year
      return m[3] + '-' + pad(mon) + '-' + pad(day);
    }
    var t = Date.parse(v + ' 12:00');
    if (!isNaN(t)) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    return '';
  }

  /* ---------- time handling (calendar) ---------- */
  var CLOCK = /(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?m\.?|(\d{1,2}):(\d{2})(?::\d{2})?/gi;
  function toMinutes(h, mi, ap) {
    h = +h; mi = +(mi || 0);
    if (ap) { ap = ap.toLowerCase(); if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; }
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }
  function clocksIn(str) {
    var out = [], m;
    CLOCK.lastIndex = 0;
    while ((m = CLOCK.exec(String(str || '')))) {
      var v = m[1] !== undefined ? toMinutes(m[1], m[2], m[3]) : toMinutes(m[4], m[5], null);
      if (v !== null) out.push(v);
    }
    return out;
  }
  function fmtClock(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return pad(h) + ':' + pad(m) + ' ' + ap;
  }

  /* Normalise either a CMS-style JSON event or a Google-Sheet row into one shape. */
  function normEvent(raw) {
    var date = normDate(raw.date);
    var title = String(raw.title || '').trim();
    if (!date || !title) return null;
    var startTxt = raw['start time'] != null ? raw['start time'] : raw.start;
    var endTxt = raw['end time'] != null ? raw['end time'] : raw.end;
    var start = null, end = null;
    if (startTxt !== undefined || endTxt !== undefined) {          // sheet layout: separate columns
      var s = clocksIn(startTxt), e = clocksIn(endTxt);
      start = s.length ? s[0] : null; end = e.length ? e[0] : null;
    } else {                                                        // old layout: one free-text "time"
      var txt = raw.time || '';
      if (!/all\s*day/i.test(txt)) { var c = clocksIn(txt); if (c.length) { start = c[0]; end = c.length > 1 ? c[1] : null; } }
    }
    if (start === null) end = null;
    var timeText = start === null ? 'All day' : (end !== null ? fmtClock(start) + ' – ' + fmtClock(end) : fmtClock(start));
    if (start === null && raw.time && !/all\s*day/i.test(raw.time) && clocksIn(raw.time).length === 0) timeText = raw.time; // e.g. "Morning"
    return {
      date: date, title: title, category: String(raw.category || 'Event').trim() || 'Event',
      body: String(raw.details != null ? raw.details : (raw.body || '')).trim(),
      start: start, end: end, timeText: timeText
    };
  }

  /* ---------- "add to calendar" ---------- */
  function utcStamp(dateISO, mins) {
    var p = dateISO.split('-');
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2], Math.floor(mins / 60), mins % 60) - TZ_OFFSET_HOURS * 3600000;
    var d = new Date(t);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  function nextDay(dateISO) {
    var p = dateISO.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1));
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }
  function ymd(dateISO) { return dateISO.replace(/-/g, ''); }
  function range(ev) {
    if (ev.start === null) return { allDay: true, s: ymd(ev.date), e: nextDay(ev.date) };
    var endMins = (ev.end !== null && ev.end > ev.start) ? ev.end : ev.start + 60;
    return { allDay: false, s: utcStamp(ev.date, ev.start), e: utcStamp(ev.date, endMins) };
  }
  function details(ev) { return (ev.body ? ev.body + '\n\n' : '') + 'School calendar: ' + SITE_URL; }

  function googleLink(ev) {
    var r = range(ev);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(ev.title) +
      '&dates=' + r.s + '/' + r.e +
      '&details=' + encodeURIComponent(details(ev)) +
      '&location=' + encodeURIComponent(LOCATION);
  }
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {
    var out = '';
    while (line.length > 74) { out += line.slice(0, 74) + '\r\n '; line = line.slice(74); }
    return out + line;
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  function icsFor(events) {
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ACK Moi Girls Kamusinga//School Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:ACK Moi Girls Kamusinga'];
    events.forEach(function (ev) {
      var r = range(ev);
      lines.push('BEGIN:VEVENT',
        'UID:' + ymd(ev.date) + '-' + slug(ev.title) + '@moigirlskamusinga.net',
        'DTSTAMP:' + stamp,
        r.allDay ? 'DTSTART;VALUE=DATE:' + r.s : 'DTSTART:' + r.s,
        r.allDay ? 'DTEND;VALUE=DATE:' + r.e : 'DTEND:' + r.e,
        'SUMMARY:' + icsEscape(ev.title),
        'DESCRIPTION:' + icsEscape(details(ev)),
        'LOCATION:' + icsEscape(LOCATION),
        'CATEGORIES:' + icsEscape(ev.category),
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function downloadICS(events, filename) {
    var blob = new Blob([icsFor(events)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function injectStyles() {
    if (document.getElementById('portal-styles')) return;
    var st = document.createElement('style');
    st.id = 'portal-styles';
    st.textContent =
      '.cal-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}' +
      '.cal-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .85rem;border-radius:9999px;border:1px solid #E2E8F0;background:#fff;color:#7C3AED;font-size:12px;font-weight:700;line-height:1.2;cursor:pointer;text-decoration:none;transition:background .2s,border-color .2s}' +
      '.cal-btn:hover{background:#F5F3FF;border-color:#C4B5FD}' +
      '.cal-all{margin:-.5rem 0 1.25rem}';
    document.head.appendChild(st);
  }

  /* ---------- file links (Google Drive) ---------- */
  /* Teachers paste a normal Drive "share" link; turn it into a direct download. Anything else is left as is. */
  function fileHref(url) {
    url = String(url || '').trim();
    if (!url) return '';
    var m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/);
    if (m) return 'https://drive.google.com/uc?export=download&id=' + m[1];
    m = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
    if (m) return 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/export?format=pdf';
    if (/^(https?:\/\/|\/|assets\/|images\/)/i.test(url)) return url;   // never allow javascript: etc.
    return '';
  }

  /* ---------- load from the Google Sheet, fall back to the JSON file ---------- */
  async function loadRows(sheetUrl, jsonUrl, key) {
    if (sheetUrl) {
      try { return parseCSV(await fetchText(sheetUrl)); } catch (e) { /* fall through to JSON */ }
    }
    var data = await fetchJSON(jsonUrl);
    return data[key] || [];
  }

  /* ================= ASSIGNMENTS ================= */
  function initAssignments(opts) {
    var listEl = document.querySelector(opts.list);
    var formSelect = document.querySelector(opts.formFilter);
    var subjectSelect = document.querySelector(opts.subjectFilter);
    if (!listEl) return;

    var all = [];

    function render(items) {
      if (!items.length) {
        listEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-3 block"></i>No matching assignments for that selection.</li>';
        return;
      }
      listEl.innerHTML = items.map(function (item) {
        var d = new Date(item.date + 'T00:00:00');
        var dateLong = isNaN(d) ? esc(item.date) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        var href = fileHref(item.file);
        return '' +
        '<li class="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-corporate transition-shadow">' +
          '<div class="sm:w-40 flex-shrink-0">' +
            '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-brand-purple ring-1 ring-purple-200">' + esc(item.subject) + '</span>' +
            '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">' + esc(item.form) + '</div>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<h3 class="font-display text-base font-bold text-brand-navyDark leading-snug">' + esc(item.title) + '</h3>' +
            '<p class="text-xs text-slate-400 mt-1"><i class="fa-regular fa-calendar mr-1.5"></i>Issued ' + dateLong + '</p>' +
          '</div>' +
          (href
            ? '<a href="' + escAttr(href) + '" target="_blank" rel="noopener" class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-brand-purple hover:bg-brand-purpleHover transition-colors"><i class="fa-solid fa-download"></i> Download</a>'
            : '<span class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-400 bg-slate-100"><i class="fa-regular fa-clock"></i> No file yet</span>') +
        '</li>';
      }).join('');
    }

    function applyFilters() {
      var f = formSelect ? formSelect.value : 'all';
      var s = subjectSelect ? subjectSelect.value : 'all';
      render(all.filter(function (item) {
        return (f === 'all' || item.form === f) && (s === 'all' || item.subject === s);
      }));
    }

    if (formSelect) formSelect.addEventListener('change', applyFilters);
    if (subjectSelect) subjectSelect.addEventListener('change', applyFilters);

    loadRows(SHEETS.assignments, opts.src, 'items').then(function (rows) {
      all = rows.map(function (r) {
        return {
          title: String(r.title || '').trim(),
          date: normDate(r.date),
          form: String(r.form || '').trim(),
          subject: String(r.subject || '').trim(),
          file: r.file != null ? r.file : r.assignment_file
        };
      }).filter(function (r) { return r.title && r.date; })
        .sort(function (a, b) { return b.date.localeCompare(a.date); });
      applyFilters();
    }).catch(function () {
      listEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-solid fa-circle-info text-brand-purple text-2xl mb-3 block"></i>No assignments have been published yet. Check back soon.</li>';
    });
  }

  /* ================= CALENDAR ================= */
  var CATEGORY_STYLES = {
    Academic: 'bg-purple-50 text-brand-purple ring-purple-200',
    Sports:   'bg-blue-50 text-brand-blue ring-blue-200',
    Event:    'bg-indigo-50 text-indigo-700 ring-indigo-200',
    Welfare:  'bg-brand-sky text-brand-navyDark ring-slate-200',
    Holiday:  'bg-violet-50 text-violet-700 ring-violet-200'
  };
  var MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function eventCard(item, past, idx) {
    var d = new Date(item.date + 'T00:00:00');
    var day = isNaN(d) ? '--' : d.getDate();
    var mon = isNaN(d) ? '' : MONTHS[d.getMonth()];
    var cls = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Event;
    return '' +
    '<li class="flex gap-4 sm:gap-6 items-start p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm' + (past ? ' opacity-60' : ' hover:shadow-corporate transition-shadow') + '">' +
      '<div class="flex-shrink-0 w-16 sm:w-20 text-center rounded-2xl bg-brand-lightBg border border-slate-200/80 py-3">' +
        '<div class="font-display text-2xl sm:text-3xl font-bold text-brand-navyDark leading-none">' + day + '</div>' +
        '<div class="text-[11px] font-bold tracking-wider text-brand-purple mt-1">' + mon + '</div>' +
      '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ring-1 ' + cls + '">' + esc(item.category) + '</span>' +
        '<h3 class="font-display text-lg font-bold text-brand-navyDark leading-snug mt-2">' + esc(item.title) + '</h3>' +
        (item.body ? '<p class="text-sm text-slate-600 mt-1 leading-relaxed">' + esc(item.body) + '</p>' : '') +
        '<p class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-clock mr-1.5"></i>' + esc(item.timeText) + '</p>' +
        (past ? '' :
          '<div class="cal-actions">' +
            '<a class="cal-btn" href="' + escAttr(googleLink(item)) + '" target="_blank" rel="noopener"><i class="fa-regular fa-calendar-plus"></i> Google Calendar</a>' +
            '<button type="button" class="cal-btn" data-ics="' + idx + '"><i class="fa-solid fa-file-arrow-down"></i> Apple / Outlook (.ics)</button>' +
          '</div>') +
      '</div>' +
    '</li>';
  }

  function initCalendar(opts) {
    var upcomingEl = document.querySelector(opts.upcoming);
    var pastEl = document.querySelector(opts.past);
    if (!upcomingEl) return;
    injectStyles();

    loadRows(SHEETS.calendar, opts.src, 'events').then(function (rows) {
      var events = rows.map(normEvent).filter(Boolean);
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var upcoming = [], past = [];

      events.forEach(function (e) {
        var d = new Date(e.date + 'T00:00:00');
        (d >= today ? upcoming : past).push(e);
      });
      upcoming.sort(function (a, b) { return a.date.localeCompare(b.date) || ((a.start === null ? -1 : a.start) - (b.start === null ? -1 : b.start)); });
      past.sort(function (a, b) { return b.date.localeCompare(a.date); });

      upcomingEl.innerHTML = upcoming.length
        ? upcoming.map(function (e, i) { return eventCard(e, false, i); }).join('')
        : '<li class="py-14 text-center text-slate-500"><i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-3 block"></i>No upcoming events scheduled right now.</li>';

      /* one button to save every upcoming event at once */
      var old = document.getElementById('cal-all-wrap');
      if (old) old.remove();
      if (upcoming.length > 1) {
        var wrap = document.createElement('div');
        wrap.id = 'cal-all-wrap'; wrap.className = 'cal-actions cal-all';
        wrap.innerHTML = '<button type="button" class="cal-btn" id="cal-all-btn"><i class="fa-regular fa-calendar-plus"></i> Add all upcoming events to my calendar (.ics)</button>';
        upcomingEl.parentNode.insertBefore(wrap, upcomingEl);
        wrap.querySelector('button').addEventListener('click', function () { downloadICS(upcoming, 'moi-girls-kamusinga-calendar.ics'); });
      }
      upcomingEl.onclick = function (ev) {
        var btn = ev.target.closest && ev.target.closest('[data-ics]');
        if (!btn) return;
        var item = upcoming[+btn.getAttribute('data-ics')];
        if (item) downloadICS([item], slug(item.title) + '.ics');
      };

      if (pastEl) {
        pastEl.innerHTML = past.length
          ? past.map(function (e) { return eventCard(e, true, 0); }).join('')
          : '<li class="py-10 text-center text-slate-400 text-sm">No past events recorded for this term yet.</li>';
      }
    }).catch(function () {
      upcomingEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-solid fa-circle-info text-brand-purple text-2xl mb-3 block"></i>The school calendar has not been published yet. Check back soon.</li>';
      if (pastEl) pastEl.innerHTML = '';
    });
  }

  window.Portal = { assignments: initAssignments, calendar: initCalendar };
})();












/* Assignments & Calendar — now backed by the CMS at /admin/.
   Both pages fetch a JSON file that staff edit through Decap CMS (git-gateway),
   so content updates the moment an editor publishes a change — no build step,
   no localStorage, and it's the same for every visitor. */
// (function () {

//   function esc(str) {
//     var d = document.createElement('div');
//     d.textContent = str == null ? '' : str;
//     return d.innerHTML;
//   }

//   async function fetchJSON(url) {
//     var res = await fetch(url, { cache: 'no-store' });
//     if (!res.ok) throw new Error('Fetch failed: ' + res.status);
//     return res.json();
//   }

//   /* ================= ASSIGNMENTS ================= */
//   function initAssignments(opts) {
//     var listEl = document.querySelector(opts.list);
//     var formSelect = document.querySelector(opts.formFilter);
//     var subjectSelect = document.querySelector(opts.subjectFilter);
//     if (!listEl) return;

//     var all = [];

//     function render(items) {
//       if (!items.length) {
//         listEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-3 block"></i>No matching assignments for that selection.</li>';
//         return;
//       }
//       listEl.innerHTML = items.map(function (item) {
//         var d = new Date(item.date + 'T00:00:00');
//         var dateLong = isNaN(d) ? item.date : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
//         var hasFile = item.assignment_file && item.assignment_file.trim();
//         return '' +
//         '<li class="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-corporate transition-shadow">' +
//           '<div class="sm:w-40 flex-shrink-0">' +
//             '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-brand-purple ring-1 ring-purple-200">' + esc(item.subject) + '</span>' +
//             '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">' + esc(item.form) + '</div>' +
//           '</div>' +
//           '<div class="flex-1 min-w-0">' +
//             '<h3 class="font-display text-base font-bold text-brand-navyDark leading-snug">' + esc(item.title) + '</h3>' +
//             '<p class="text-xs text-slate-400 mt-1"><i class="fa-regular fa-calendar mr-1.5"></i>Issued ' + dateLong + '</p>' +
//           '</div>' +
//           (hasFile
//             ? '<a href="' + item.assignment_file + '" target="_blank" rel="noopener" class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-brand-purple hover:bg-brand-purpleHover transition-colors"><i class="fa-solid fa-download"></i> Download</a>'
//             : '<span class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-400 bg-slate-100"><i class="fa-regular fa-clock"></i> No file yet</span>') +
//         '</li>';
//       }).join('');
//     }

//     function applyFilters() {
//       var f = formSelect ? formSelect.value : 'all';
//       var s = subjectSelect ? subjectSelect.value : 'all';
//       render(all.filter(function (item) {
//         return (f === 'all' || item.form === f) && (s === 'all' || item.subject === s);
//       }));
//     }

//     if (formSelect) formSelect.addEventListener('change', applyFilters);
//     if (subjectSelect) subjectSelect.addEventListener('change', applyFilters);

//     fetchJSON(opts.src).then(function (data) {
//       all = (data.items || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
//       applyFilters();
//     }).catch(function () {
//       listEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-solid fa-circle-info text-brand-purple text-2xl mb-3 block"></i>No assignments have been published yet. Check back soon.</li>';
//     });
//   }

//   /* ================= CALENDAR ================= */
//   var CATEGORY_STYLES = {
//     Academic: 'bg-purple-50 text-brand-purple ring-purple-200',
//     Sports:   'bg-blue-50 text-brand-blue ring-blue-200',
//     Event:    'bg-indigo-50 text-indigo-700 ring-indigo-200',
//     Welfare:  'bg-brand-sky text-brand-navyDark ring-slate-200',
//     Holiday:  'bg-violet-50 text-violet-700 ring-violet-200'
//   };
//   var MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

//   function eventCard(item, past) {
//     var d = new Date(item.date + 'T00:00:00');
//     var day = isNaN(d) ? '--' : d.getDate();
//     var mon = isNaN(d) ? '' : MONTHS[d.getMonth()];
//     var cls = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Event;
//     return '' +
//     '<li class="flex gap-4 sm:gap-6 items-start p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm' + (past ? ' opacity-60' : ' hover:shadow-corporate transition-shadow') + '">' +
//       '<div class="flex-shrink-0 w-16 sm:w-20 text-center rounded-2xl bg-brand-lightBg border border-slate-200/80 py-3">' +
//         '<div class="font-display text-2xl sm:text-3xl font-bold text-brand-navyDark leading-none">' + day + '</div>' +
//         '<div class="text-[11px] font-bold tracking-wider text-brand-purple mt-1">' + mon + '</div>' +
//       '</div>' +
//       '<div class="flex-1 min-w-0">' +
//         '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ring-1 ' + cls + '">' + esc(item.category) + '</span>' +
//         '<h3 class="font-display text-lg font-bold text-brand-navyDark leading-snug mt-2">' + esc(item.title) + '</h3>' +
//         (item.body ? '<p class="text-sm text-slate-600 mt-1 leading-relaxed">' + esc(item.body) + '</p>' : '') +
//         '<p class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-clock mr-1.5"></i>' + esc(item.time || '') + '</p>' +
//       '</div>' +
//     '</li>';
//   }

//   function initCalendar(opts) {
//     var upcomingEl = document.querySelector(opts.upcoming);
//     var pastEl = document.querySelector(opts.past);
//     if (!upcomingEl) return;

//     fetchJSON(opts.src).then(function (data) {
//       var events = data.events || [];
//       var today = new Date(); today.setHours(0, 0, 0, 0);
//       var upcoming = [], past = [];

//       events.forEach(function (e) {
//         var d = new Date(e.date + 'T00:00:00');
//         (d >= today ? upcoming : past).push(e);
//       });
//       upcoming.sort(function (a, b) { return a.date.localeCompare(b.date); });
//       past.sort(function (a, b) { return b.date.localeCompare(a.date); });

//       upcomingEl.innerHTML = upcoming.length
//         ? upcoming.map(function (e) { return eventCard(e, false); }).join('')
//         : '<li class="py-14 text-center text-slate-500"><i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-3 block"></i>No upcoming events scheduled right now.</li>';

//       if (pastEl) {
//         pastEl.innerHTML = past.length
//           ? past.map(function (e) { return eventCard(e, true); }).join('')
//           : '<li class="py-10 text-center text-slate-400 text-sm">No past events recorded for this term yet.</li>';
//       }
//     }).catch(function () {
//       upcomingEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-solid fa-circle-info text-brand-purple text-2xl mb-3 block"></i>The school calendar has not been published yet. Check back soon.</li>';
//       if (pastEl) pastEl.innerHTML = '';
//     });
//   }

//   window.Portal = { assignments: initAssignments, calendar: initCalendar };
// })();
