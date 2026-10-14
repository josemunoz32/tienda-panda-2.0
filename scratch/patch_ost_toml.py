toml_content = """skip_appinfo_wait = true

[lua]
paths = ["plugins", "config/st-plugin", "config/stplug-in"]

[cloud]
enabled = true

[update]
auto = false
check_on_start = false
"""

with open(r"C:\Program Files (x86)\Steam\opensteamtool.toml", "w", encoding="utf-8") as f:
    f.write(toml_content)

print("Updated opensteamtool.toml successfully!")
