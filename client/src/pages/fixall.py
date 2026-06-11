import re, os

pages_dir = os.path.dirname(os.path.abspath(__file__))
files = sorted([f for f in os.listdir(pages_dir) if f.endswith('.tsx')])

total_fixes = 0
for fname in files:
    fpath = os.path.join(pages_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix ALL broken Link attributes: replace "Link o={`" with "Link to="
    # This handles both <Link o={` and <Link \to={` patterns
    # The ` character in the pattern will match the backtick used for template literals

    # Replace everything between "Link " and the closing `} with proper "to=\"..."
    # Pattern: Link + opts (space) + o= + backtick + content + backtick + }
    content = re.sub(r'Link\s+o={`([^`]*)`}', lambda m: 'Link to="' + m.group(1).replace('\n', ' ') + '"', content)

    # Also handle the case where there's a backslash before 'to' (literal \to in source)
    content = re.sub(r'Link\\to={`([^`]*)`}', lambda m: 'Link to="' + m.group(1).replace('\n', ' ') + '"', content)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {fname}")
        total_fixes += 1
    else:
        print(f"OK: {fname}")

print(f"\nTotal files fixed: {total_fixes}")
