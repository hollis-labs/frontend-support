import sys; sys.path.insert(0,'/tmp/sf6/gen')
from gen import CSS, status, frame, page
CSS2 = CSS + """
.shell{display:grid;grid-template-columns:200px 1fr;height:100%}.rail{border-right:1px solid var(--sub);padding:12px 8px;display:flex;flex-direction:column;gap:2px;overflow:hidden}
.rail .brand{font-weight:600;font-size:13px;padding:4px 8px 12px}.rail .it{padding:5px 8px;border-radius:6px;color:var(--fg2);font-size:12px;display:flex;gap:8px;align-items:center}.rail .it.on{background:var(--sel);color:var(--fg)}
.rail .grp{margin-top:12px;padding:0 8px 4px;font:10px ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}.rail .ft{margin-top:auto;border-top:1px solid var(--sub);padding-top:8px}
.rail .bd{margin-left:auto;font-size:10px;color:var(--muted)}.main{display:flex;flex-direction:column;min-height:0;position:relative;overflow:hidden}
.sg{display:grid;grid-template-columns:170px minmax(0,640px);gap:32px;padding:20px 24px;flex:1;min-height:0}.sg .ol{border:0;padding:0}.grpc{border:1px solid var(--border);border-radius:10px;background:var(--elev);margin-bottom:16px}.grpc .gh{padding:12px 14px;border-bottom:1px solid var(--sub)}.grpc .gh b{font-size:13px}.grpc .gh div{color:var(--muted);font-size:11px;margin-top:2px}
.fr{display:grid;grid-template-columns:200px 1fr;gap:16px;padding:12px 14px;border-bottom:1px solid var(--sub);align-items:start}.fr:last-child{border:0}.fr .k{font-size:12px}.fr .h{font-size:11px;color:var(--muted);margin-top:2px}
.tog{width:30px;height:16px;border-radius:8px;background:var(--surface);position:relative;display:inline-block}.tog.on{background:var(--fg)}.tog:after{content:'';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--muted)}.tog.on:after{left:16px;background:#000}
.err{border-color:var(--danger)!important}.em{color:var(--danger);font-size:11px;margin-top:3px}
.menu{position:absolute;background:var(--elev);border:1px solid var(--hover);border-radius:10px;padding:4px;min-width:190px;box-shadow:0 8px 24px rgba(0,0,0,.45);z-index:5}.menu div{padding:6px 10px;border-radius:6px;font-size:12px;display:flex;justify-content:space-between;gap:16px}.menu div.on{background:var(--sel)}.menu hr{border:0;border-top:1px solid var(--sub);margin:4px 0}.menu .dg2{color:var(--danger)}.menu kbd{color:var(--muted);font:10px ui-monospace,monospace}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:6}.scrim.b{align-items:flex-end}
.dlg{background:var(--elev);border:1px solid var(--hover);border-radius:10px;width:440px;max-width:94%;padding:16px;box-shadow:0 16px 48px rgba(0,0,0,.5)}.dlg h3{margin:0 0 6px;font-size:14px}.dlg p{margin:0 0 12px;color:var(--fg2);font-size:12px}.dlg .ac{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.sheet{background:var(--elev);border-top:1px solid var(--hover);border-radius:10px 10px 0 0;width:100%;padding:8px 12px 16px}.sheet .gr{width:36px;height:4px;border-radius:2px;background:var(--hover);margin:0 auto 10px}.sheet div.i{padding:10px 8px;font-size:13px}
.toast{position:absolute;left:50%;transform:translateX(-50%);bottom:16px;background:var(--elev);border:1px solid var(--hover);border-radius:10px;padding:8px 12px;display:flex;gap:14px;align-items:center;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:7}
.secret{font:12px ui-monospace,monospace;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;gap:8px;align-items:center;word-break:break-all}
.dock{position:absolute;top:0;right:0;bottom:0;width:380px;background:var(--elev);border-left:1px solid var(--hover);display:flex;flex-direction:column;z-index:4}.dock .tabs{display:flex;gap:14px;padding:10px 14px;border-bottom:1px solid var(--sub);color:var(--muted)}.dock .tabs .on{color:var(--fg)}
.tab3{display:flex;border-top:1px solid var(--sub);background:var(--elev)}.tab3 div{flex:1;text-align:center;padding:10px 0;font-size:11px;color:var(--muted)}.tab3 .on{color:var(--fg)}
.warnb{border:1px solid rgba(226,214,196,.35);background:rgba(226,214,196,.07);color:var(--warn);border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:12px}
"""
def rail(active="Plugins"):
    def it(n,b=''): return f'<div class="it{" on" if n==active else ""}">{n}<span class="bd">{b}</span></div>'
    return ('<div class="rail"><div class="brand">Hadron</div>'+it("Home")+it("Plugins","6")+it("Activity")
      +'<div class="grp">Billing</div>'+it("Invoices")+it("Customers")+'<div class="grp">Notes</div>'+it("All notes")+it("Templates")
      +'<div class="ft">'+it("Access keys")+it("Settings")+'</div></div>')
def shell(main,active="Plugins"): return f'<div class="shell">{rail(active)}<div class="main">{main}</div></div>'
def hdr(t,right=''): return f'<div class="hdr"><h1>{t}</h1><span class="sp"></span>{right}</div>'
def inp(v,ph=False,cls=''): return f'<div class="in {cls}" style="{"color:var(--muted)" if ph else ""}">{v}</div>'
def fr(k,h,c): return f'<div class="fr"><div><div class="k">{k}</div><div class="h">{h}</div></div><div>{c}</div></div>'
def grp(t,d,rows): return f'<div class="grpc"><div class="gh"><b>{t}</b><div>{d}</div></div>{rows}</div>'
sec_ol='<div class="ol"><div class="on">General</div><div>Notifications</div><div>Limits</div><div>Danger zone</div></div>'
def settings(state="view"):
    dirty=state in("dirty","error")
    name_e = state=="error"
    g1=grp("General","Shown across the app.",
      fr("Workspace name","Visible to everyone.",(inp("Workspace name",ph=True,cls="err") if name_e else inp("Acme operations",cls="dirty" if dirty else ""))+('<div class="em">Name is required.</div>' if name_e else ''))
      +fr("Default landing page","Where people start.",inp("Plugins"))
      +fr("Compact lists","Dense table rows instead of two-line rows.",'<span class="tog"></span>'))
    g2=grp("Notifications","Who hears about plugin failures.",
      fr("Email on failure","Sent to owners.",'<span class="tog on"></span>')+fr("Digest","Daily summary.",inp("Daily at 08:00")))
    g3=grp("Danger zone","Cannot be undone.",fr("Delete workspace","Removes all plugins and data.",'<button class="btn d">Delete workspace…</button>'))
    bar=''
    if dirty: bar=f'<div class="rev"><span style="font-size:11px;color:var(--fg2)">{"Fix 1 error to continue" if name_e else "1 change"}</span><span class="sp"></span><button class="btn">Discard</button><button class="btn p" style="{"opacity:.4" if name_e else ""}">Review changes</button></div>'
    return shell(hdr("Settings")+f'<div class="sg">{sec_ol}<div style="overflow:hidden">{g1}{g2}{g3}</div></div>{bar}',"Settings")
def settings_m(): 
    return ('<div class="hdr"><h1>Settings</h1></div><div class="olm"><span class="on">General</span><span>Notifications</span><span>Limits</span><span>Danger zone</span></div><div style="padding:14px;flex:1;overflow:hidden">'
      +grp("General","Shown across the app.",f'<div style="padding:12px 14px"><div class="k">Workspace name</div><div class="h" style="color:var(--muted);font-size:11px;margin:2px 0 6px">Visible to everyone.</div>{inp("Acme operations",cls="dirty")}</div><div style="padding:12px 14px;border-top:1px solid var(--sub);display:flex;align-items:center"><div><div class="k">Compact lists</div><div class="h" style="color:var(--muted);font-size:11px">Dense rows.</div></div><span class="sp"></span><span class="tog"></span></div>')
      +'</div><div class="rev"><span style="font-size:11px;color:var(--fg2)">1 change</span><span class="sp"></span><button class="btn">Discard</button><button class="btn p">Review</button></div>')
def formpage(state="fill"):
    e=state=="error"
    body=(fr("Source","Registry package or git URL.",inp("@hollis/notes",cls="")+'')
      +fr("Name","Lowercase, used in routes.",inp("notes" if not e else "Notes!",cls="err" if e else "")+('<div class="em">Use lowercase letters, numbers and dashes.</div>' if e else ''))
      +fr("Version","Pin or follow latest.",inp("0.9.0"))
      +fr("Start after install","Run immediately.",'<span class="tog on"></span>')
      +fr("Owner","Who is notified.",inp("Pick a person" if e else "hollis",ph=e,cls="err" if e else "")+('<div class="em">Choose an owner.</div>' if e else '')))
    banner='<div class="warnb" style="border-color:rgba(226,173,180,.4);color:var(--danger);background:var(--danger-m)">2 fields need attention.</div>' if e else ''
    foot=f'<div class="rev"><span class="sp"></span><button class="btn">Cancel</button><button class="btn p" style="{"" if state!="busy" else "opacity:.6"}">{"Adding…" if state=="busy" else "Add plugin"}</button></div>'
    return shell(f'<div class="back" style="color:var(--muted)">Plugins / <span style="color:var(--fg)">Add plugin</span></div>'+hdr("Add plugin")+f'<div style="padding:16px 24px;max-width:760px;flex:1;overflow:hidden">{banner}<div class="grpc">{body}</div></div>{foot}')
def keys_rows():
    K=[("ci-deploy","hk_…7f3a","plugins:read, plugins:write","Created 12 days ago","Used 2h ago","Active"),("laptop","hk_…c91d","plugins:read","Created 3 months ago","Used yesterday","Active"),("old-script","hk_…02be","plugins:read","Created 1 year ago","Never used","Expires in 3 days")]
    o=''
    for n,p,sc,c,u,s in K:
        o+=f'<div class="row"><div style="flex:1;min-width:0"><div class="t">{n} <span class="mono" style="color:var(--muted);font-size:11px">{p}</span></div><div class="s">{sc} · {c} · {u}</div></div>{status(s,"dot w" if "Expires" in s else "dot")}<button class="btn">Revoke…</button></div>'
    return o
def keys(state="list"):
    base=hdr("Access keys",'<button class="btn p">Create key</button>')+f'<div style="overflow:hidden;flex:1">{keys_rows()}</div>'
    ov=''
    if state=="create":
        ov='<div class="scrim"><div class="dlg"><h3>Create access key</h3>'+fr("Name","Helps you find it later.",inp("ci-deploy"))+fr("Access","Least access that works.",inp("plugins:read, plugins:write"))+fr("Expires","Keys without expiry are discouraged.",inp("In 90 days"))+'<div class="ac"><button class="btn">Cancel</button><button class="btn p">Create key</button></div></div></div>'
    if state=="reveal":
        ov='<div class="scrim"><div class="dlg"><h3>Copy your key now</h3><p>This is the only time it is shown. Store it somewhere safe.</p><div class="secret"><span style="flex:1">hk_EXAMPLE_not_a_real_key_0000000000</span><button class="btn">Copy</button></div><div class="ac"><button class="btn p">Done</button></div></div></div>'
    if state=="revoke":
        ov='<div class="scrim"><div class="dlg"><h3>Revoke “ci-deploy”?</h3><p>Anything using this key stops working immediately. This cannot be undone.</p><div class="ac"><button class="btn">Cancel</button><button class="btn d">Revoke key</button></div></div></div>'
    return shell(base+ov,"Access keys")
def menu_frame(kind="menu"):
    from gen import rows,header
    base=hdr("Plugins",'<button class="btn p">Add plugin</button>')+f'<div style="flex:1;overflow:hidden;position:relative">{rows(sel=1)}'
    if kind=="menu":
        base+='<div class="menu" style="right:70px;top:100px"><div class="on">Stop<kbd>S</kbd></div><div>Restart<kbd>R</kbd></div><div>Copy plugin id</div><div>Open logs</div><hr><div class="dg2">Remove…</div></div>'
    base+='</div>'
    if kind=="confirm":
        base+='<div class="scrim"><div class="dlg"><h3>Remove “notes”?</h3><p>Its pages, panel and settings leave the app. Data is kept for 30 days.</p><div class="ac"><button class="btn">Cancel</button><button class="btn d">Remove</button></div></div></div>'
    if kind=="toast":
        base+='<div class="toast"><span>Stopped “notes”</span><span style="color:var(--fg)">Undo</span></div>'
    if kind=="fail":
        base+='<div class="toast" style="border-color:rgba(226,173,180,.4)"><span style="color:var(--danger)">Could not stop “notes”: it is in use by 2 sessions.</span><span>Details</span></div>'
    return shell(base)
def menu_m(kind):
    from gen import rows
    s='<div class="hdr"><h1>Plugins</h1><span class="sp"></span><button class="btn p">Add</button></div><div style="flex:1;overflow:hidden;position:relative">'+rows(sel=-1)+'</div>'
    if kind=="sheet":
        s+='<div class="scrim b"><div class="sheet"><div class="gr"></div><div class="cap" style="padding:0 8px 6px">notes</div><div class="i">Stop</div><div class="i">Restart</div><div class="i">Copy plugin id</div><div class="i">Open logs</div><div class="i" style="color:var(--danger);border-top:1px solid var(--sub)">Remove…</div></div></div>'
    return s
def nav_frame(kind):
    main=hdr("Notes · All notes",'<button class="btn">Chat</button>')+'<div style="padding:16px 24px;color:var(--muted);flex:1">Plugin page content renders here (surface.page).</div>'
    if kind=="dock":
        main+='<div class="dock"><div class="tabs"><span class="on">Chat</span><span>Context</span><span>Tools</span><span class="sp"></span><span>✕</span></div><div style="padding:14px;color:var(--muted);flex:1">dock.tab contents. Esc closes. Exclusive: opening another dock replaces this one.</div></div>'
    return shell(main,"All notes")
def nav_m(kind):
    top='<div class="hdr"><h1>Notes</h1><span class="sp"></span><button class="btn">Chat</button></div><div style="padding:16px;color:var(--muted);flex:1">Plugin page content (surface.page).</div>'
    if kind=="tabs": return top+'<div class="tab3"><div class="on">Home</div><div>Plugins</div><div>Notes</div><div>More</div></div>'
    if kind=="more": return top+'<div class="scrim b"><div class="sheet"><div class="gr"></div><div class="cap" style="padding:0 8px 6px">Billing</div><div class="i">Invoices</div><div class="i">Customers</div><div class="cap" style="padding:8px 8px 6px">Notes</div><div class="i">All notes</div><div class="i">Templates</div><div class="cap" style="padding:8px 8px 6px">You</div><div class="i">Access keys</div><div class="i">Settings</div></div></div>'
    if kind=="dock": return top+'<div class="scrim b"><div class="sheet" style="height:62%"><div class="gr"></div><div class="tabs" style="display:flex;gap:14px;color:var(--muted);padding:0 8px 8px;border-bottom:1px solid var(--sub)"><span style="color:var(--fg)">Chat</span><span>Context</span><span>Tools</span></div><div style="padding:12px 8px;color:var(--muted)">dock.tab contents as a bottom sheet.</div></div></div>'
F=[]
def D(id,l,inner): F.append(frame(id,l,1440,inner))
def M(id,l,inner): F.append(frame(id,l,390,f'<div class="page" style="position:relative">{inner}</div>'))
D("s-view","settings: groups from the admin manifest, outline anchors",settings("view"))
D("s-dirty","settings: edit marks the field, review bar appears",settings("dirty"))
D("s-error","settings: field error blocks review",settings("error"))
M("sm-dirty","settings 390",settings_m())
D("f-fill","form: add plugin",formpage("fill"))
D("f-error","form: errors inline plus summary",formpage("error"))
D("f-busy","form: submitting",formpage("busy"))
M("fm","form 390",'<div class="back">← Plugins</div><div class="hdr"><h1>Add plugin</h1></div><div style="padding:14px;flex:1;overflow:hidden">'+grp("","",'<div style="padding:12px 14px"><div class="k">Source</div>'+inp("@hollis/notes")+'</div><div style="padding:12px 14px;border-top:1px solid var(--sub)"><div class="k">Name</div>'+inp("notes")+'</div>')+'</div><div class="rev"><button class="btn" style="flex:1">Cancel</button><button class="btn p" style="flex:1">Add plugin</button></div>')
D("k-list","auth/keys: list, secrets never shown",keys("list"))
D("k-create","auth/keys: create key dialog",keys("create"))
D("k-reveal","auth/keys: one-time reveal (placeholder value)",keys("reveal"))
D("k-revoke","auth/keys: revoke confirm (high risk)",keys("revoke"))
D("a-menu","action menu: row overflow, danger last behind a divider",menu_frame("menu"))
D("a-confirm","action menu: confirm for high-risk action",menu_frame("confirm"))
D("a-toast","action menu: ok outcome with undo",menu_frame("toast"))
D("a-fail","action menu: failed outcome with reason",menu_frame("fail"))
M("am-sheet","action menu 390: bottom sheet",menu_m("sheet"))
D("n-shell","multi-plugin nav: primary, plugin groups, footer",nav_frame("page"))
D("n-dock","multi-plugin nav: dock.tab chat drawer open",nav_frame("dock"))
M("nm-tabs","nav 390: tab bar",nav_m("tabs"))
M("nm-more","nav 390: More sheet lists plugin groups",nav_m("more"))
M("nm-dock","nav 390: dock as bottom sheet",nav_m("dock"))
out=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Golden: settings, form, auth/keys, action menu, nav (SF-6)</title><style>{CSS2}</style></head><body><div class="note" style="padding:12px 0 0 12px;color:#8e9298;font:11px ui-monospace,monospace">SF-6 batch 2. Theme nanite-default dark. #frame-id for one frame.</div><div class="wrap" style="padding:0 12px">{"".join(F)}</div></body></html>'
open('/tmp/sf6/out/golden-pages.html','w').write(out); print(len(F))
