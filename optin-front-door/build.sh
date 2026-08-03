#!/usr/bin/env bash
# Build the vsl-b front-door page.
#
#   ./build.sh            build from the snapshot in src/vsl-b.live.html
#   ./build.sh --fetch    re-pull the live page first, then build
#
# Output: dist/index.html, a drop-in replacement for vsl-b's index.html.
# Nothing else on the deploy changes: no new files, no new requests, and
# every existing script/stylesheet reference is untouched.
set -euo pipefail
cd "$(dirname "$0")"

LIVE="https://vsl-b.ridleyacademy.team/"
SNAP="src/vsl-b.live.html"

if [ "${1:-}" = "--fetch" ]; then
  echo "fetching $LIVE"
  curl -sf "$LIVE" -o "$SNAP"
fi

python3 - "$SNAP" <<'PY'
import sys, pathlib, re

snap = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
head = pathlib.Path('src/door.head.html').read_text(encoding='utf-8')
body = pathlib.Path('src/door.body.html').read_text(encoding='utf-8')
foot = pathlib.Path('src/door.foot.html').read_text(encoding='utf-8')

if 'id="door"' in snap:
    sys.exit('refusing to build: snapshot already contains the door')

def once(hay, needle, new, label):
    n = hay.count(needle)
    if n != 1:
        sys.exit(f'anchor {label!r} found {n} times, expected 1')
    return hay.replace(needle, new, 1)

# door.body.html holds two blocks that land in different places: the door
# overlay (top of body) and the post-video choice (inline, right after the
# page's hero CTA). Split them on the choice marker.
MARK = '<!-- ============ POST-VIDEO CHOICE ============'
if MARK not in body:
    sys.exit('door.body.html is missing the POST-VIDEO CHOICE marker')
door_markup, choice_markup = body.split(MARK, 1)
choice_markup = MARK + choice_markup

# The page's own hero CTA. Tagged .gate-cta so it can be hidden for a visitor
# who already opted in, with the choice block taking its place.
HERO_CTA = (
    '<div class="center reveal d1 gate-hide" style="margin-top:clamp(26px,3.4vw,44px)">\n'
    '      <a href="#book" class="btn btn--fire btn--lg">Book My Free Piano Consultation</a>\n'
    '      <p class="cta-note cta-note--dark">&#128274; No Credit Card Required</p>\n'
    '    </div>'
)

out = snap
out = once(out, '</head>', head + '</head>', 'head close')
out = once(out, '<div class="progress" id="progress"></div>',
           door_markup.rstrip() + '\n\n<div class="progress" id="progress"></div>', 'progress bar')

hero = HERO_CTA if HERO_CTA in out else None
if hero is None:
    # fall back to the opening tag alone, so a whitespace change downstream
    # does not silently drop the choice block
    OPEN = '<div class="center reveal d1 gate-hide" style="margin-top:clamp(26px,3.4vw,44px)">'
    if out.count(OPEN) != 1:
        sys.exit('hero CTA anchor not found; cannot place the post-video choice')
    out = out.replace(OPEN, OPEN.replace('gate-hide', 'gate-hide gate-cta'), 1)
    out = once(out, '<div class="book" id="book" hidden>',
               choice_markup.rstrip() + '\n\n    <div class="book" id="book" hidden>', 'book section')
else:
    out = out.replace(
        hero,
        hero.replace('gate-hide"', 'gate-hide gate-cta"', 1) + '\n\n' + choice_markup.rstrip(),
        1)

out = once(out, '</body>', foot + '</body>', 'body close')

# Founder's name: Chris 7/31, it is Steven, not Stephen. The live page and
# ridleyacademy.com both ship "Stephen", so this touches copy the door sits
# on top of as well as the door itself. To ship the page with the site's
# current spelling instead, delete these two lines and rebuild.
before = len(re.findall(r'Stephen', out))
out = out.replace('Stephen', 'Steven')

# "Masterclass" means the PAID flagship program ("The Complete Piano
# Masterclass", per the page's own FAQ). The base page also uses the word
# for the FREE VSL in two places, which promises the paid program for free.
# Only those two are rewritten; the FAQ and the customer quote are the
# correct usage and are left exactly as they are.
free_video_fixes = [
    ("f.title='Ridley Academy masterclass'", "f.title='Ridley Academy free video'"),
    ('aria-label="Restart the masterclass from the beginning with sound"',
     'aria-label="Restart the free video from the beginning with sound"'),
]
mc = 0
for old, new in free_video_fixes:
    if old in out:
        out = out.replace(old, new)
        mc += 1

# CALENDLY AUTO-INIT CRASH.
# The page ships an EMPTY <div class="calendly-inline-widget" id="calInline">
# with no data-url. Calendly's widget.js scans for that class on load and does
# url.split(...) on it, so it throws "Cannot read properties of null" and never
# assigns window.Calendly. When widget.js (async) happens to execute after that
# div is parsed, Calendly is dead for the whole page and NO calendar can mount,
# not ours and not main.js's. Observed live: undefined on vsl-b, present on
# vsl-a, i.e. a load-order race rather than a per-page difference.
# main.js never reads this class (it mounts via parentElement + the id), so
# renaming it is safe and removes the crash without changing any behaviour.
cal_fix = out.count('class="calendly-inline-widget" id="calInline"')
out = out.replace('class="calendly-inline-widget" id="calInline"',
                  'class="ccal-manual" id="calInline"')

pathlib.Path('dist').mkdir(exist_ok=True)
pathlib.Path('dist/index.html').write_text(out, encoding='utf-8')

print(f'wrote dist/index.html  ({len(snap):,} -> {len(out):,} bytes)')
print(f'renamed Stephen -> Steven in {before} places')
print(f'free-video masterclass refs rewritten: {mc}/2')
print(f'calendly auto-init crash neutralised: {cal_fix} div(s)')
PY
