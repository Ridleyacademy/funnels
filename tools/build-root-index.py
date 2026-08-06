#!/usr/bin/env python3
"""Generate the site root page (/index.html) from funnel-build/index.html.

WHY THIS EXISTS
The root used to be a 1.6KB stub whose whole job was a zero-second
<meta http-equiv="refresh"> to /funnel-build/index.html. That cost a round trip
on every ad click, and worse, the refresh target is a bare path with no query
string, so it threw gclid away on the way through. Every Google Ads click that
landed on the root arrived at the funnel stripped of the click ID that paid for
it. The root has to be the real page.

WHY GENERATED RATHER THAN MOVED
The obvious move is to shift funnel-build/* up to the root. It collides:
funnel-build/quiz-funnel/index.html and the root quiz-funnel/index.html are
different live pages, and the root one is the newer verified build. So the
files stay where they are and the home page is rendered up to the root with its
relative references rewritten to absolute /funnel-build/ ones.

That leaves exactly one editable copy of the home page: funnel-build/index.html.
This script re-derives the root from it. Run it after any home page edit:

    python3 tools/build-root-index.py

It is deterministic and safe to re-run.
"""
import re
import pathlib

SRC = pathlib.Path("funnel-build/index.html")
OUT = pathlib.Path("index.html")
PREFIX = "/funnel-build/"

# Only these attributes hold paths. data-vsl-yt is a YouTube video ID and
# data-yt likewise: rewriting them would break the VSL gate.
PATH_ATTRS = ("href", "src", "poster", "data-poster", "data-src", "data-url", "action")
EXTERNAL = ("http://", "https://", "//", "#", "mailto:", "tel:", "data:", "javascript:", "/")

BANNER = """<!-- GENERATED FILE - DO NOT EDIT BY HAND.
     Built from funnel-build/index.html by tools/build-root-index.py.
     Edit that file, then re-run the script. Any change made directly here is
     lost on the next build.

     This is the page every Google Ads click lands on. It is served flat at the
     root: no redirect, no meta refresh, so the gclid query string survives the
     landing intact. -->
"""


def rewrite(value: str) -> str:
    v = value.strip()
    if not v or v.startswith(EXTERNAL):
        return value
    return PREFIX + v


def rewrite_srcset(value: str) -> str:
    out = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        bits = part.split(None, 1)
        url = rewrite(bits[0])
        out.append(url + (" " + bits[1] if len(bits) > 1 else ""))
    return ", ".join(out)


def main() -> None:
    src = SRC.read_text(encoding="utf-8")

    def attr_sub(m):
        name, value = m.group(1), m.group(2)
        low = name.lower()
        if low == "srcset":
            return f'{name}="{rewrite_srcset(value)}"'
        if low in PATH_ATTRS:
            return f'{name}="{rewrite(value)}"'
        return m.group(0)

    out = re.sub(r'([\w-]+)\s*=\s*"([^"]*)"', attr_sub, src)

    # Seat the banner directly after the doctype so it is the first thing a
    # human opening this file sees.
    if out.lstrip().lower().startswith("<!doctype"):
        i = out.index(">", out.lower().index("<!doctype")) + 1
        out = out[:i] + "\n" + BANNER + out[i:]
    else:
        out = BANNER + out

    OUT.write_text(out, encoding="utf-8")
    print(f"wrote {OUT} ({len(out)} bytes) from {SRC}")


if __name__ == "__main__":
    main()
