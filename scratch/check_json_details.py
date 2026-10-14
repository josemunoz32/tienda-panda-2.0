import json
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\Usuario\proyectopandastore20\botTele-main\botTele-main\result.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

messages = data.get('messages', [])

tipo3_match_total = 0
device_counts = {0: 0, 1: 0, 2: 0, "other": 0}
sample_by_device = {0: [], 1: [], 2: []}
precios = []
countries = {}

for m in messages:
    if m.get('type') != 'message':
        continue
    txt = m.get('text', '')
    if isinstance(txt, list):
        txt = "".join([x if isinstance(x, str) else x.get('text', '') for x in txt])
    
    if "💎 NUEVA CUENTA DISPONIBLE 💎" in txt:
        tipo3_match_total += 1
        
        # ID
        match_id = re.search(r'ID:\s*(#?\d+)', txt, re.IGNORECASE)
        id_val = match_id.group(1) if match_id else "N/A"
        
        # Devices
        match_dev = re.search(r'Devices:\s*\[(.*?)\]', txt, re.IGNORECASE)
        if match_dev:
            raw_dev = match_dev.group(1).strip()
            if not raw_dev:
                dev_list = []
            else:
                dev_list = [d.strip() for d in raw_dev.split(',') if d.strip()]
        else:
            dev_list = []
            
        c = len(dev_list)
        if c in device_counts:
            device_counts[c] += 1
        else:
            device_counts["other"] += 1
            
        if len(sample_by_device.get(c, [])) < 2:
            sample_by_device[c].append({
                "id": id_val,
                "devices": dev_list,
                "msg_id": m.get('id')
            })
            
        # Country
        match_country = re.search(r'Country:\s*([A-Z]{2})', txt, re.IGNORECASE)
        if match_country:
            co = match_country.group(1)
            countries[co] = countries.get(co, 0) + 1
            
        # Precio
        match_price = re.search(r'💰\s*PRECIO:\s*([\d.]+)\s*USDT', txt, re.IGNORECASE)
        if match_price:
            precios.append(float(match_price.group(1)))

print(f"Total mensajes: {len(messages)}")
print(f"Total con 'NUEVA CUENTA DISPONIBLE': {tipo3_match_total}")
print(f"Conteo por cantidad de dispositivos en Devices:")
for k, v in device_counts.items():
    print(f"  {k} consolas: {v} packs")

print(f"\nPrecios USDT encontrados: Min={min(precios) if precios else 0}, Max={max(precios) if precios else 0}, Promedio={sum(precios)/len(precios) if precios else 0:.2f}")

print("\nEjemplos:")
for k, samples in sample_by_device.items():
    print(f"-- Dispositivos = {k} --")
    for s in samples:
        print(f"   ID: {s['id']}, Devices: {s['devices']}, Telegram Msg ID: {s['msg_id']}")

print(f"\nPaíses más comunes:")
for co, count in sorted(countries.items(), key=lambda x: -x[1])[:10]:
    print(f"   {co}: {count}")
