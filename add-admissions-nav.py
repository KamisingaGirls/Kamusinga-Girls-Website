#!/usr/bin/env python3
"""Adds an "Admissions" link right after "Academics" in the menu (desktop + mobile)
and in the footer "Explore" list of every .html page in this folder.
Safe to run more than once. Only touches those three spots; nothing else in your pages changes.
Usage: put this file next to your .html files, then run:  python3 add-admissions-nav.py
"""
import glob, re, sys

DESK = '<a href="admissions.html" class="px-4 py-2 rounded-full text-sm font-semibold text-slate-700 hover:text-brand-blue hover:bg-slate-50 transition-colors">Admissions</a>'
MOB  = '<a href="admissions.html" class="block px-4 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-slate-50">Admissions</a>'
FOOT = '\n          <li><a href="admissions%s" class="hover:text-white transition-colors">Admissions</a></li>'

acad = re.compile(r'<a href="academics\.html"[^>]*>Academics</a>')
foot = re.compile(r'<li><a href="academics(\.html)?" class="hover:text-white transition-colors">Academics</a></li>')

for path in sorted(glob.glob('*.html')):
    if path == 'admissions.html':
        continue
    s = open(path, encoding='utf-8').read()
    done = []
    def add_nav(m):
        tag = m.group(0)
        if 'block px-4 py-3' in tag:   kind, new = 'mobile', MOB
        elif 'px-4 py-2' in tag:       kind, new = 'desktop', DESK
        else: return tag
        done.append(kind)
        return tag + new
    if 'href="admissions.html"' not in s:
        s2 = acad.sub(add_nav, s)
    else:
        s2 = s
    if not re.search(r'<li><a href="admissions(\.html)?"', s2):
        n_before = len(done)
        s2 = foot.sub(lambda m: (done.append('footer'), m.group(0) + FOOT % (m.group(1) or ''))[1], s2)
    if s2 != s:
        open(path, 'w', encoding='utf-8').write(s2)
    print('%-18s added: %s' % (path, ', '.join(done) if done else 'nothing (already done or not found)'))
