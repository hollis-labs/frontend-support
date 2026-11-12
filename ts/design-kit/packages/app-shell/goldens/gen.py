import html
CSS = """
:root{--bg:#0c0d0e;--elev:#16181a;--surface:#25282c;--hover:#34383d;--fg:#e8eaed;--fg2:#98a0a8;--muted:#91979e;--faint:#8e9298;--border:#25282c;--sub:#1d1f22;--sel:rgba(255,255,255,.08);--danger:#e2adb4;--danger-m:rgba(226,173,180,.10);--ok:#cadcd5;--warn:#e2d6c4}
*{box-sizing:border-box}body{margin:0;background:#050506;color:var(--fg);font:12px/1.4 ui-sans-serif,system-ui,sans-serif}
.mono{font-family:ui-monospace,Menlo,monospace}.cap{font:10px ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.frame{background:var(--bg);margin:0 0 24px;border:1px solid var(--sub);overflow:hidden}.f1440{width:1440px;height:760px}.f390{width:390px;height:780px}
.lbl{font:11px ui-monospace,monospace;color:#8e9298;padding:6px 0}
body:has(.frame:target) .note{display:none}body:has(.frame:target) .wrap{padding:0!important}
body:has(.frame:target) .frame:not(:target),body:has(.frame:target) .lbl{display:none}body:has(.frame:target){background:var(--bg)}body:has(.frame:target) .frame{margin:0;border:0}
.page{display:flex;flex-direction:column;height:100%}.hdr{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--sub);flex-wrap:wrap}.hdr h1{font-size:15px;font-weight:600;margin:0}.sp{flex:1}
.btn{border:1px solid var(--border);background:transparent;color:var(--fg);border-radius:6px;padding:4px 10px;font-size:12px;white-space:nowrap}.btn.p{background:var(--fg);color:#000;border-color:var(--fg)}.btn.d{color:var(--danger);border-color:rgba(226,173,180,.35)}
.seg{display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden}.seg span{padding:3px 10px;font-size:11px;color:var(--fg2)}.seg span.on{background:var(--sel);color:var(--fg)}
.search{border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--muted);width:190px;font-size:12px}
.body{display:grid;flex:1;min-height:0}.body.two{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}.body.one{grid-template-columns:1fr}.list{border-right:1px solid var(--sub);overflow:hidden;position:relative}
.row{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--sub)}.row.sel{background:var(--sel)}.row .t{font-size:13px}.row .s{font-size:11px;color:var(--muted)}.row .a{color:var(--muted);font-size:11px;opacity:0}.row.sel .a{opacity:1}
.chk{width:14px;height:14px;border:1px solid var(--muted);border-radius:3px;flex:none;display:inline-block}.chk.on{background:var(--fg);border-color:var(--fg);position:relative}.chk.on:after{content:'';position:absolute;left:4px;top:1px;width:3px;height:7px;border:solid #000;border-width:0 2px 2px 0;transform:rotate(45deg)}
.st{display:inline-flex;align-items:center;gap:6px;font-size:11px;white-space:nowrap}.dot{width:6px;height:6px;border-radius:50%;background:var(--ok)}.dot.w{background:var(--warn)}.dot.d{background:var(--danger)}.dot.s{background:var(--muted)}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;color:var(--muted);font-weight:500;padding:8px 12px;border-bottom:1px solid var(--sub)}td{padding:8px 12px;border-bottom:1px solid var(--sub);font-size:13px}tr.sel td{background:var(--sel)}
.det{display:flex;flex-direction:column;min-height:0;overflow:hidden}.dh{padding:14px 18px;border-bottom:1px solid var(--sub);display:flex;gap:10px;align-items:center}.dh h2{margin:0;font-size:14px}.dg{display:grid;grid-template-columns:130px 1fr;flex:1;min-height:0}.dg.m{grid-template-columns:1fr}
.ol{padding:14px 12px;border-right:1px solid var(--sub)}.ol div{padding:3px 6px;color:var(--muted);font-size:12px}.ol div.on{color:var(--fg);background:var(--sel);border-radius:4px}.olm{display:flex;gap:14px;padding:8px 16px;border-bottom:1px solid var(--sub);color:var(--muted);font-size:12px}.olm .on{color:var(--fg)}
.dc{padding:14px 18px;overflow:hidden}.card{border:1px solid var(--border);border-radius:10px;background:var(--elev);padding:12px;margin-bottom:12px}.f{margin-bottom:10px}.f .k{font-size:11px;color:var(--muted);margin-bottom:3px}.in{border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;background:var(--bg)}.in.dirty{border-color:var(--fg2)}
.rev{display:flex;align-items:center;gap:10px;border-top:1px solid var(--sub);padding:10px 18px;background:var(--elev)}
.bulk{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:8px;background:var(--elev);border:1px solid var(--hover);border-radius:10px;padding:8px 12px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;text-align:center;padding:24px}.center h3{margin:0;font-size:14px}.center p{margin:0;color:var(--muted);max-width:340px;font-size:12px}
.sk{height:11px;border-radius:4px;background:var(--surface);opacity:.6}.diff{font:12px ui-monospace,monospace;border:1px solid var(--border);border-radius:6px;overflow:hidden}.diff div{padding:4px 10px}.diff .m{background:var(--danger-m);color:var(--danger)}.diff .p{background:rgba(202,220,213,.10);color:var(--ok)}
.back{padding:10px 16px;border-bottom:1px solid var(--sub);color:var(--fg2);font-size:12px}
"""
P=[("billing","core","1.4.2","billing and invoices","Running","dot"),
   ("notes","hollis","0.9.0","per-thread notes","Running","dot"),
   ("terminal","core","2.0.1","slow to respond 2m ago","Degraded","dot w"),
   ("exporter","acme","0.3.7","exited with code 2","Failed","dot d"),
   ("search","hollis","1.1.0","stopped by you yesterday","Stopped","dot s"),
   ("mailer","acme","3.2.0","sent 41 today","Running","dot")]
def status(s,d): return f'<span class="st"><i class="{d}"></i>{s}</span>'
def header(count="6 installed",select=False,sel_n=0,w=1440):
    seg='<div class="seg"><span class="on">All</span><span>Running</span><span>Stopped</span><span>Failed</span></div>'
    if w<640:
        return f'<div class="hdr"><h1>Plugins</h1><span class="cap">{count}</span><span class="sp"></span><button class="btn p">Add</button><div style="width:100%;display:flex;gap:8px;align-items:center">{seg}<span class="sp"></span><button class="btn">{"Done" if select else "Select"}</button></div></div>'
    return f'<div class="hdr"><h1>Plugins</h1><span class="cap">{count}</span><span class="sp"></span>{seg}<span class="search">Search plugins</span><button class="btn">{"Done" if select else "Select"}</button><button class="btn p">Add plugin</button></div>'
def rows(sel=1,select=False,checked=()):
    o=''
    for i,(n,ow,v,ctx,s,d) in enumerate(P):
        c=f'<i class="chk{" on" if i in checked else ""}"></i>' if select else ''
        a='' if select else '<span class="a">Stop · ⋯</span>'
        o+=f'<div class="row{" sel" if i==sel else ""}">{c}<div style="flex:1;min-width:0"><div class="t">{n}</div><div class="s">{ow} · {v} · {ctx}</div></div>{a}{status(s,d)}</div>'
    return o
def table(sel=1):
    o='<table><tr><th>Name</th><th>Owner</th><th>Status</th><th>Version</th><th></th></tr>'
    for i,(n,ow,v,ctx,s,d) in enumerate(P):
        o+=f'<tr{" class=sel" if i==sel else ""}><td>{n}</td><td class="mono" style="font-size:11px">{ow}</td><td>{status(s,d)}</td><td class="mono" style="font-size:11px">{v}</td><td style="color:var(--muted);font-size:11px;{"" if i==sel else "opacity:0"}">Stop · ⋯</td></tr>'
    return o+'</table>'
def detail(mode="view",w=1440):
    dirty = mode in("edit","review")
    desc='<div class="in dirty">Per-thread notes and scratchpad, shared with agents on request.</div>' if dirty else '<div class="in">Per-thread notes and scratchpad.</div>'
    if mode=="review":
        main='<div class="cap" style="margin-bottom:8px">Review changes</div><div class="diff"><div class="cap" style="padding:6px 10px">Description</div><div class="m">- Per-thread notes and scratchpad.</div><div class="p">+ Per-thread notes and scratchpad, shared with agents on request.</div></div><div class="card" style="margin-top:12px"><div class="cap" style="margin-bottom:6px">Effect</div><div style="font-size:12px;color:var(--fg2)">Applies to new sessions. Running sessions keep the current description until restarted.</div></div>'
        foot='<div class="rev"><span style="font-size:11px;color:var(--fg2)">1 change</span><span class="sp"></span><button class="btn">Back to editing</button><button class="btn p">Save changes</button></div>'
    else:
        main=f'<div class="cap" style="margin-bottom:8px">Identity</div><div class="f"><div class="k">Name</div><div class="in">notes</div></div><div class="f"><div class="k">Description</div>{desc}</div><div class="card"><div class="cap" style="margin-bottom:6px">Resolved</div><div style="font-size:13px">owner hollis · version 0.9.0 · installed 3 days ago</div></div>'
        foot='<div class="rev"><span style="font-size:11px;color:var(--fg2)">1 change</span><span class="sp"></span><button class="btn">Discard</button><button class="btn p">Review changes</button></div>' if dirty else ''
    outline='<div class="ol"><div class="on">Identity</div><div>Runtime</div><div>Settings</div><div>Used by</div><div>History</div></div>'
    olm='<div class="olm"><span class="on">Identity</span><span>Runtime</span><span>Settings</span><span>Used by</span><span>History</span></div>'
    head=f'<div class="dh"><h2>notes</h2>{status("Running","dot")}<span class="sp"></span><button class="btn">Stop</button><button class="btn">⋯</button></div>'
    if w<640: return f'<div class="det">{head}{olm}<div class="dc" style="flex:1">{main}</div>{foot}</div>'
    return f'<div class="det">{head}<div class="dg">{outline}<div class="dc">{main}</div></div>{foot}</div>'
def page(inner,h): return f'<div class="page">{inner}</div>'
def frame(id,label,w,inner):
    return f'<div class="lbl">{id}: {label}</div><section class="frame f{w}" id="{id}">{inner}</section>'
F=[]
F.append(frame("d-list",'1440 default: rows, detail beside the list',1440,page(header()+f'<div class="body two"><div class="list">{rows()}</div>{detail("view")}</div>',0)))
F.append(frame("d-edit",'1440 editing in place, review bar',1440,page(header()+f'<div class="body two"><div class="list">{rows()}</div>{detail("edit")}</div>',0)))
F.append(frame("d-review",'1440 review changes step',1440,page(header()+f'<div class="body two"><div class="list">{rows()}</div>{detail("review")}</div>',0)))
bulk='<div class="bulk"><span style="font-size:12px">2 selected</span><span class="sp"></span><button class="btn">Stop</button><button class="btn">Restart</button><button class="btn d">Remove</button></div>'
F.append(frame("d-select",'1440 select mode, bulk bar (Remove is the only danger action)',1440,page(header(select=True)+f'<div class="body two"><div class="list">{rows(select=True,checked=(0,5))}{bulk}</div>{detail("view")}</div>',0)))
F.append(frame("d-compact",'1440 compact density: dense table (user setting, same content)',1440,page(header()+f'<div class="body two"><div class="list">{table()}</div>{detail("view")}</div>',0)))
F.append(frame("d-empty",'1440 empty: nothing installed',1440,page(header("0 installed")+'<div class="body one"><div class="center"><h3>No plugins installed</h3><p>Plugins add pages, panels and actions. Add one to get started.</p><button class="btn p">Add plugin</button></div></div>',0)))
F.append(frame("d-nomatch",'1440 empty: filter has no matches',1440,page(header("0 of 6")+'<div class="body one"><div class="center"><h3>No plugins match</h3><p>No plugins are Failed and match “notes”.</p><button class="btn">Clear filters</button></div></div>',0)))
sk=''.join('<div class="row"><div style="flex:1"><div class="sk" style="width:%dpx;margin-bottom:7px"></div><div class="sk" style="width:%dpx;height:9px"></div></div><div class="sk" style="width:60px"></div></div>'%(90+i*20,170+(i%3)*30) for i in range(6))
F.append(frame("d-loading",'1440 loading: skeleton rows, header and filters stay',1440,page(header("")+f'<div class="body two"><div class="list">{sk}</div><div class="det"><div class="center"><div class="sk" style="width:160px"></div></div></div></div>',0)))
F.append(frame("d-error",'1440 error: list failed to load, retry',1440,page(header("")+'<div class="body one"><div class="center"><h3>Could not load plugins</h3><p>The request failed. Nothing was changed.</p><button class="btn p">Try again</button></div></div>',0)))
F.append(frame("m-list",'390 list',390,page(header(w=390)+f'<div class="body one"><div class="list" style="border:0">{rows(sel=-1)}</div></div>',0)))
F.append(frame("m-detail",'390 detail: back link, outline as a scroll strip, edit in place',390,page('<div class="back">← Plugins</div>'+detail("edit",w=390),0)))
F.append(frame("m-select",'390 select mode, bulk bar',390,page(header(select=True,w=390)+f'<div class="body one"><div class="list" style="border:0">{rows(sel=-1,select=True,checked=(0,5))}{bulk}</div></div>',0)))
out=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Golden: list and detail page types (SF-6)</title><style>{CSS}</style></head><body><div class="note" style="padding:12px 0 0 12px;color:#8e9298;font:11px ui-monospace,monospace">SF-6 list + detail. Theme nanite-default dark. Open with #frame-id to see one frame full size.</div><div class="wrap" style="padding:0 12px">{"".join(F)}</div></body></html>'
open('/tmp/sf6/out/golden-list-detail.html','w').write(out)
print(len(out))
