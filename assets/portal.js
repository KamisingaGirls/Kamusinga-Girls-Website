/* Assignments & Calendar — now backed by the CMS at /admin/.
   Both pages fetch a JSON file that staff edit through Decap CMS (git-gateway),
   so content updates the moment an editor publishes a change — no build step,
   no localStorage, and it's the same for every visitor. */
(function () {

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : str;
    return d.innerHTML;
  }

  async function fetchJSON(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    return res.json();
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
        var dateLong = isNaN(d) ? item.date : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        var hasFile = item.assignment_file && item.assignment_file.trim();
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
          (hasFile
            ? '<a href="' + item.assignment_file + '" target="_blank" rel="noopener" class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-brand-purple hover:bg-brand-purpleHover transition-colors"><i class="fa-solid fa-download"></i> Download</a>'
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

    fetchJSON(opts.src).then(function (data) {
      all = (data.items || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
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

  function eventCard(item, past) {
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
        '<p class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-clock mr-1.5"></i>' + esc(item.time || '') + '</p>' +
      '</div>' +
    '</li>';
  }

  function initCalendar(opts) {
    var upcomingEl = document.querySelector(opts.upcoming);
    var pastEl = document.querySelector(opts.past);
    if (!upcomingEl) return;

    fetchJSON(opts.src).then(function (data) {
      var events = data.events || [];
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var upcoming = [], past = [];

      events.forEach(function (e) {
        var d = new Date(e.date + 'T00:00:00');
        (d >= today ? upcoming : past).push(e);
      });
      upcoming.sort(function (a, b) { return a.date.localeCompare(b.date); });
      past.sort(function (a, b) { return b.date.localeCompare(a.date); });

      upcomingEl.innerHTML = upcoming.length
        ? upcoming.map(function (e) { return eventCard(e, false); }).join('')
        : '<li class="py-14 text-center text-slate-500"><i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-3 block"></i>No upcoming events scheduled right now.</li>';

      if (pastEl) {
        pastEl.innerHTML = past.length
          ? past.map(function (e) { return eventCard(e, true); }).join('')
          : '<li class="py-10 text-center text-slate-400 text-sm">No past events recorded for this term yet.</li>';
      }
    }).catch(function () {
      upcomingEl.innerHTML = '<li class="py-14 text-center text-slate-500"><i class="fa-solid fa-circle-info text-brand-purple text-2xl mb-3 block"></i>The school calendar has not been published yet. Check back soon.</li>';
      if (pastEl) pastEl.innerHTML = '';
    });
  }

  window.Portal = { assignments: initAssignments, calendar: initCalendar };
})();
