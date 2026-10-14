import json

# 1. Update steam_import_data.json
steam_file = 'src/assets/steam_import_data.json'
with open(steam_file, 'r', encoding='utf-8') as f:
    items = json.load(f)

initial_count = len(items)

def is_blocked(name):
    n = (name or '').lower()
    if 'minecraft dungeons' in n or 'minecraft legends' in n:
        return True
    if 'squad' == n or n.startswith('squad ') or 'arma reforger' in n or 'hell let loose' in n or 'insurgency: sandstorm' in n or 'world war 3' in n or 'beyond the wire' in n:
        return True
    if 'warzone' in n or 'cold war' in n or 'vanguard' in n or 'modern warfare ii' in n or 'modern warfare iii' in n or 'multiplayer' in n or 'dedicated server' in n or ('call of duty' in n and 'zombie' in n):
        return True
    if 'rainbow six' in n or 'the division' in n or 'for honor' in n or 'skull and bones' in n or 'riders republic' in n or 'roller champions' in n or 'xdefiant' in n:
        return True
    if 'nba 2k' in n or 'topspin' in n or 'top spin' in n or 'ea sports fc' in n or 'fifa' in n or 'pga tour 2k' in n:
        return True
    if n in ['dayz', 'rust', 'pubg', 'pubg: battlegrounds', 'dead by daylight', 'destiny 2', 'fall guys', 'the finals'] or 'hunt: showdown' in n:
        return True
    return False

items = [it for it in items if not is_blocked(it.get('name', ''))]

with open(steam_file, 'w', encoding='utf-8') as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print(f"steam_import_data.json updated: {initial_count} -> {len(items)} (Removed {initial_count - len(items)})")
