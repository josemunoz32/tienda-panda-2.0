import json, sys
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(open(r'c:\Users\Usuario\proyectopandastore20\botTele-main\botTele-main\result.json', encoding='utf-8'))
for m in d.get('messages', []):
    txt = m.get('text', '')
    if isinstance(txt, list):
        txt = ''.join([x if isinstance(x, str) else x.get('text', '') for x in txt])
    if 'NUEVA CUENTA DISPONIBLE' not in txt:
        print(f"ID: {m.get('id')} | Type: {m.get('type')} | Text: {txt[:80]}")
