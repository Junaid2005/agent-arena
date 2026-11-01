#!/usr/bin/env python3
"""Restore only the AGENT ARENA route after Caddy reloads. Never replace other sites."""
import json, urllib.request
HOST = 'ghost-arena.162.19.137.169.sslip.io'
URL = 'http://127.0.0.1:2019/config/apps/http/servers/srv0/routes'
with urllib.request.urlopen(URL,timeout=5) as response:
    routes=json.load(response)
if any(HOST in matcher.get('host',[]) for route in routes for matcher in route.get('match',[])):
    raise SystemExit(0)
route={'@id':'ghost-arena','match':[{'host':[HOST]}], 'handle':[{'handler':'reverse_proxy','upstreams':[{'dial':'127.0.0.1:3011'}]}], 'terminal':True}
request=urllib.request.Request(URL,data=json.dumps(route).encode(),headers={'Content-Type':'application/json'},method='POST')
with urllib.request.urlopen(request,timeout=15) as response:
    assert response.status==200
print('AGENT ARENA HTTPS route installed')
