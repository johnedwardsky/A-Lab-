import os

path = '/Users/johnsky/Documents/balthomes.ru/templates/full-object-template.html'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix LOCATION
text = text.replace('{{ \n                    LOCATION }}', '{{ LOCATION }}')
# Try other variations too just in case
text = text.replace('{{\n                    LOCATION }}', '{{ LOCATION }}')
text = text.replace('{ { GALLERY_JS } }', '{{ GALLERY_JS }}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Done fixing template")
