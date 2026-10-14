import json
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\Usuario\proyectopandastore20\botTele-main\botTele-main\result.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

messages = data.get('messages', [])
print(f"Total mensajes: {len(messages)}")

device_patterns = {}
id_patterns = {}
msg_types = []

for m in messages:
    if m.get('type') != 'message':
        continue
    txt = m.get('text', '')
    if isinstance(txt, list):
        txt = "".join([x if isinstance(x, str) else x.get('text', '') for x in txt])
    
    if "NUEVA CUENTA DISPONIBLE" in txt:
        match_dev = re.search(r'Devices:\s*\[(.*?)\]', txt, re.IGNORECASE)
        dev_val = match_dev.group(1).strip() if match_dev else "NO_DEVICES_FIELD"
        device_patterns[dev_val] = device_patterns.get(dev_val, 0) + 1

        match_id = re.search(r'ID:\s*(#?\w+)', txt, re.IGNORECASE)
        id_val = match_id.group(1) if match_id else "NO_ID"
        id_patterns[id_val] = id_patterns.get(id_val, 0) + 1

print("\n--- Patrones de Devices ---")
for k, v in sorted(device_patterns.items(), key=lambda x: -x[1]):
    print(f"  Devices: [{k}] -> {v} veces")

print(f"\nTotal mensajes con 'NUEVA CUENTA DISPONIBLE': {sum(device_patterns.values())}")
