import re, glob, os

THEME_LIST = ["modern","luxury","minimal","classic","tally","billdesk","emerald","darkpro","stripe","crimson","ocean","monochrome","formal","dark"]
THEME_STR = str(THEME_LIST)

OLD_12 = ["corporate","elegant","minimal","modern","tally","billdesk","darkpro","stripe","emerald","crimson","ocean","monochrome"]
OLD_12_STR = str(OLD_12)

root = "C:/Users/Admin/Desktop/Calude Test/erp-app"

# 1. Update config/settings.js
with open(f"{root}/config/settings.js", "r") as f:
    c = f.read()
c = c.replace("default_theme: 'corporate',", "default_theme: 'modern',")
old = "available_themes: ['corporate','elegant','minimal','modern','tally','billdesk','darkpro','stripe','emerald','crimson','ocean','monochrome']"
new = "available_themes: ['modern','luxury','minimal','classic','tally','billdesk','emerald','darkpro','stripe','crimson','ocean','monochrome','formal','dark']"
c = c.replace(old, new)
with open(f"{root}/config/settings.js", "w") as f:
    f.write(c)
print("config/settings.js done")

# 2. Update models/print.js
with open(f"{root}/models/print.js", "r") as f:
    c = f.read()
c = c.replace("theme: ALLOWED_THEMES.has(theme) ? theme : 'corporate',", "theme: ALLOWED_THEMES.has(theme) ? theme : 'modern',")
old_set = "const ALLOWED_THEMES = new Set(['corporate','elegant','minimal','modern','tally','billdesk','darkpro','stripe','emerald','crimson','ocean','monochrome']);"
new_set = "const ALLOWED_THEMES = new Set(['modern','luxury','minimal','classic','tally','billdesk','emerald','darkpro','stripe','crimson','ocean','monochrome','formal','dark']);"
c = c.replace(old_set, new_set)
with open(f"{root}/models/print.js", "w") as f:
    f.write(c)
print("models/print.js done")

# 3. Update server.js
with open(f"{root}/server.js", "r") as f:
    c = f.read()
c = c.replace("default_theme: 'corporate',", "default_theme: 'modern',")
c = c.replace("const theme = req.query.theme || settings.print?.default_theme || 'corporate';", "const theme = req.query.theme || settings.print?.default_theme || 'modern';")
c = c.replace("res.locals.printTheme = 'corporate';", "res.locals.printTheme = 'modern';")
old = "available_themes: ['corporate','elegant','minimal','modern','tally','billdesk','darkpro','stripe','emerald','crimson','ocean','monochrome']"
new = "available_themes: ['modern','luxury','minimal','classic','tally','billdesk','emerald','darkpro','stripe','crimson','ocean','monochrome','formal','dark']"
c = c.replace(old, new)
with open(f"{root}/server.js", "w") as f:
    f.write(c)
print("server.js done")

# 4. Update server-modular.js
with open(f"{root}/server-modular.js", "r") as f:
    c = f.read()
c = c.replace("default_theme: 'default',", "default_theme: 'modern',")
c = c.replace("res.locals.printTheme = 'default';", "res.locals.printTheme = 'modern';")
old = "available_themes: ['corporate','elegant','minimal','modern','tally','billdesk','darkpro','stripe','emerald','crimson','ocean','monochrome']"
new = "available_themes: ['modern','luxury','minimal','classic','tally','billdesk','emerald','darkpro','stripe','crimson','ocean','monochrome','formal','dark']"
c = c.replace(old, new)
c = c.replace("const theme = req.query.theme || settings.print?.default_theme || 'default';", "const theme = req.query.theme || settings.print?.default_theme || 'modern';")
with open(f"{root}/server-modular.js", "w") as f:
    f.write(c)
print("server-modular.js done")

# 5. Update middleware/auth.js.new
with open(f"{root}/middleware/auth.js.new", "r") as f:
    c = f.read()
c = c.replace("default_theme: 'default',", "default_theme: 'modern',")
old = "available_themes: ['corporate','elegant','minimal','modern','tally','billdesk','darkpro','stripe','emerald','crimson','ocean','monochrome']"
new = "available_themes: ['modern','luxury','minimal','classic','tally','billdesk','emerald','darkpro','stripe','crimson','ocean','monochrome','formal','dark']"
c = c.replace(old, new)
with open(f"{root}/middleware/auth.js.new", "w") as f:
    f.write(c)
print("middleware/auth.js.new done")

# 6. Update scripts/seed-demo-data.js
with open(f"{root}/scripts/seed-demo-data.js", "r") as f:
    c = f.read()
old = "available_themes: ['corporate','elegant','minimal','modern','tally','billdesk','darkpro','stripe','emerald','crimson','ocean','monochrome']"
new = "available_themes: ['modern','luxury','minimal','classic','tally','billdesk','emerald','darkpro','stripe','crimson','ocean','monochrome','formal','dark']"
c = c.replace(old, new)
c = c.replace("default_theme: 'default',", "default_theme: 'modern',")
with open(f"{root}/scripts/seed-demo-data.js", "w") as f:
    f.write(c)
print("seed-demo-data.js done")

# 7. Update ALL 7 print.ejs templates
old_fallback = '["corporate","elegant","minimal","modern","tally","billdesk","darkpro","stripe","emerald","crimson","ocean","monochrome"]'
new_fallback = '["modern","luxury","minimal","classic","tally","billdesk","emerald","darkpro","stripe","crimson","ocean","monochrome","formal","dark"]'
for path in glob.glob(f"{root}/views/*/print.ejs"):
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()
    if old_fallback in c:
        c = c.replace(old_fallback, new_fallback)
        with open(path, "w", encoding="utf-8") as f:
            f.write(c)
        print(f"  Updated {os.path.relpath(path, root)}")
print("All print.ejs done")

# 8. Update print-theme-switcher.js - remove old aliases, fix fallbacks
with open(f"{root}/public/js/print-theme-switcher.js", "r") as f:
    c = f.read()
# Remove ALLOWED_THEMES reset lines (commented out already, skip)
# Fix the fallback in getDefaults
c = c.replace("if (!t) t = 'default';", "if (!t) t = 'modern';")
c = c.replace("if (!s) s = 'a4';", "if (!s) s = 'a4';")
with open(f"{root}/public/js/print-theme-switcher.js", "w") as f:
    f.write(c)
print("print-theme-switcher.js done")

print("\n=== ALL DONE ===")
