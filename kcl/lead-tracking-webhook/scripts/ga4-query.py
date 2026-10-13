#!/usr/bin/env python3
"""Consulta GA4 por el MCP local (~/.config/google-analytics-mcp/run.sh <perfil>) sin abrir sesión de Claude.
    scripts/ga4-query.py tbp list
    scripts/ga4-query.py tbp call run_report '{"property_id":"367885093",...}'
Propiedad TBP = 367885093 (tu-sitio-viejo.com, stream tu-sitio.com G-XXXXXXXXXX)."""
import sys, json, subprocess, os
profile, cmd = sys.argv[1], sys.argv[2]
p = subprocess.Popen([os.path.expanduser('~/.config/google-analytics-mcp/run.sh'), profile],
                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
def send(obj):
    p.stdin.write(json.dumps(obj) + '\n'); p.stdin.flush()
def recv(id_):
    while True:
        line = p.stdout.readline()
        if not line:
            raise SystemExit('server closed: ' + p.stderr.read()[-2000:])
        try: m = json.loads(line)
        except Exception: continue
        if m.get('id') == id_: return m
send({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {'protocolVersion': '2024-11-05', 'capabilities': {}, 'clientInfo': {'name': 'cli', 'version': '0'}}})
recv(1)
send({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
if cmd == 'list':
    send({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list'}); r = recv(2)
    for t in r['result']['tools']:
        print('-', t['name'], '::', (t.get('description') or '')[:110].replace('\n', ' '))
else:
    tool, args = sys.argv[3], json.loads(sys.argv[4] if len(sys.argv) > 4 else '{}')
    send({'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {'name': tool, 'arguments': args}}); r = recv(3)
    for c in r.get('result', {}).get('content', []):
        print(c.get('text', c))
    if 'error' in r: print('ERROR', r['error'])
p.terminate()
