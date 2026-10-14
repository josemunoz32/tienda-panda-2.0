import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\Usuario\proyectopandastore20\botTele-main\botTele-main\result.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Type:', type(data))
if isinstance(data, dict):
    print('Keys:', list(data.keys()))
    messages = data.get('messages', [])
    print('Total messages:', len(messages))
    sample = [m for m in messages if m.get('type') == 'message' and m.get('text')][:10]
    for i, m in enumerate(sample):
        print(f"=== MESSAGE {i+1} (ID: {m.get('id')}) ===")
        txt = m.get('text')
        if isinstance(txt, list):
            # extract string
            txt_str = "".join([x if isinstance(x, str) else x.get('text', '') for x in txt])
        else:
            txt_str = str(txt)
        print(txt_str[:500])
        print("-" * 40)
elif isinstance(data, list):
    print('Total items:', len(data))
    for i, m in enumerate(data[:10]):
        print(f"=== ITEM {i+1} ===")
        print(str(m)[:500])
