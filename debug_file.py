import os
with open('/Users/johnsky/Documents/balthomes.ru/templates/full-object-template.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines[709:715]):
        print(f"{i+710}: {repr(line)}")
