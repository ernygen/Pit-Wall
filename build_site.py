"""
Build index.html from Pit Wall.html + local modules.

Reads the original Pit Wall.html (default: ../Pit Wall.html next to this folder)
and emits a full-featured index.html:
  - same <head> (fonts), same layout CSS, same embedded flag CSS, same shell HTML
  - same application JS, with a 2-line guarded boot (empty data -> upload view)
  - sync localStorage loader + parser.js + assets.js + upload.js

Re-run after Pit Wall.html updates:
    python build_site.py
    python build_site.py --src "C:\\path\\to\\Pit Wall.html"
"""
import argparse
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

LOADER_JS = """window.SEASONS=[];window.BADGES={};function showUploadHome(){}
try{
  var _d=JSON.parse(localStorage.getItem('pitwall-data')||'null');
  if(_d&&_d.seasons&&_d.seasons.length){
    window.SEASONS=_d.seasons;window.BADGES=_d.badges||{};
    var _g=document.getElementById('gencss');if(_g&&_d.gencss)_g.textContent=_d.gencss;
  }
}catch(_e){}"""

UPLOAD_CSS = """.drop{border:2px dashed var(--line);border-radius:10px;padding:30px 20px;text-align:center;cursor:pointer;transition:border-color .15s}
.drop:hover,.drop.drag{border-color:var(--ink)}
.drop .big{font:900 22px/1.1 var(--fd);text-transform:uppercase}
.drop .small{color:var(--mut);font-size:13px;margin-top:6px}
.filelist{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.file{display:flex;gap:10px;align-items:center;background:var(--surf2);border-radius:8px;padding:8px 12px;font-size:13px}
.file b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.file .ok{color:var(--good);font-weight:800}.file .err{color:var(--bad);font-weight:800}
.err-box{border:1.5px solid var(--bad);border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px}
img.bd{object-fit:contain}
code{background:var(--surf2);padding:1px 6px;border-radius:4px;font-size:13px;box-shadow:inset 0 0 0 1px var(--line)}"""

# badge(): prefer game logo files served through window.BADGES (set from
# logos/ at upload time); fall back to Pit Wall's embedded badge CSS.
BADGE_ANCHOR = "const badge=(id,cls='',yr)=>`<span class=\"bd ${cls} bd-${bdid(id,yr)}\"></span>`;"
BADGE_REPLACEMENT = ("const badge=(id,cls='',yr)=>{const _u=(window.BADGES||{})[bdid(id,yr)]||(window.BADGES||{})[id];"
  "return _u?`<img class=\"bd ${cls}\" src=\"${_u}\" alt=\"\" loading=\"lazy\" onerror=\"this.remove()\">`"
  ":`<span class=\"bd ${cls} bd-${bdid(id,yr)}\"></span>`;};")


def default_src():
    here = HERE
    cands = [os.path.join(os.path.dirname(here), 'Pit Wall.html'),
             r'C:\Users\Eren Aygen\Downloads\Pit Wall.html']
    for c in cands:
        if os.path.exists(c):
            return c
    return cands[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=None)
    ap.add_argument('--out', default=os.path.join(HERE, 'index.html'))
    args = ap.parse_args()
    if not args.src:
        args.src = default_src()

    with io.open(args.src, encoding='utf-8') as f:
        html = f.read()
    styles = [m.group(1) for m in re.finditer(r'<style>(.*?)</style>', html, re.S)]
    scripts = [m.group(1) for m in re.finditer(r'<script>(.*?)</script>', html, re.S)]
    assert len(styles) >= 5, 'expected 5 style blocks, got %d' % len(styles)
    assert len(scripts) == 2 and scripts[0].lstrip().startswith('window.SEASONS='), 'unexpected script layout'
    app = scripts[1]

    shell_start = html.find('<div id="shell">')
    tip_end = html.find('<div id="tip"></div>') + len('<div id="tip"></div>')
    assert shell_start > 0 and tip_end > shell_start, 'shell not found'
    shell = html[shell_start:tip_end]

    # --- guard 1: render() with no data shows the upload view ---
    pat = re.compile(r'function render\(keep\)\{\s*yearTone\(\);')
    ms = pat.findall(app)
    assert len(ms) == 1, 'render guard anchor found %d times' % len(ms)
    app = pat.sub('function render(keep){if(!SEASONS.length||!SEASONS[st.y]){showUploadHome();return;}yearTone();', app, count=1)

    # --- guard 2: boot ---
    pat2 = re.compile(r'\nrender\(\);\s*$')
    assert pat2.search(app), 'boot anchor not found'
    app = pat2.sub('\nif(!SEASONS.length||!SEASONS[st.y]){showUploadHome();}else{render();}', app, count=1)

    # --- override 3: badge() prefers window.BADGES logo files ---
    assert app.count(BADGE_ANCHOR) == 1, 'badge anchor found %d times' % app.count(BADGE_ANCHOR)
    app = app.replace(BADGE_ANCHOR, BADGE_REPLACEMENT)

    page = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<title>Pit Wall</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Big+Shoulders+Display:wght@700;800;900&display=swap">\n'
        '<style>' + styles[0] + '</style>\n'
        '<style>' + styles[1] + '</style>\n'
        '<style>' + styles[3] + '</style>\n'
        '<style>' + styles[4] + '</style>\n'
        '<style id="gencss"></style>\n'
        '<style>' + UPLOAD_CSS + '</style>\n'
        '</head>\n<body>\n' + shell + '\n'
        '<script>' + LOADER_JS + '</script>\n'
        '<script src="./parser.js"></script>\n'
        '<script src="./assets.js"></script>\n'
        '<script>' + app + '</script>\n'
        '<script src="./upload.js"></script>\n'
        '</body>\n</html>\n'
    )
    with io.open(args.out, 'w', encoding='utf-8') as f:
        f.write(page)
    print('wrote %s (%d bytes)' % (args.out, len(page.encode('utf-8'))))


if __name__ == '__main__':
    main()
