import os, time

home = os.path.expanduser('~')
two_days_ago = time.time() - 2 * 24 * 3600
found = []

for root, dirs, files in os.walk(home):
    # skip obvious dirs
    if any(p in root for p in ['.venv', 'node_modules', '.cache', 'Library', 'api', 'env', 'site-packages']):
        continue
    for f in files:
        if f.endswith('.py') or f.endswith('.txt') or f.endswith('.md'):
            path = os.path.join(root, f)
            try:
                mtime = os.stat(path).st_mtime
                if mtime > two_days_ago:
                    found.append((mtime, path))
            except Exception:
                pass

found.sort(reverse=True)
for m, p in found[:30]:
    print(time.ctime(m), p)
