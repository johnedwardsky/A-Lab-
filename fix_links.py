import os

files = [
    '/Users/johnsky/Documents/balthomes.ru/en.html',
    '/Users/johnsky/Documents/balthomes.ru/de.html',
    '/Users/johnsky/Documents/balthomes.ru/zh.html'
]

for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace('href="index.html"', 'href="/"')
        content = content.replace('href="index.html#catalog"', 'href="/#catalog"')
        content = content.replace('href="index.html#categories"', 'href="/#categories"')
        content = content.replace('href="index.html#quiz"', 'href="/#quiz"')
        content = content.replace('href="index.html#services"', 'href="/#services"')
        content = content.replace('href="index.html#reviews"', 'href="/#reviews"')
        content = content.replace('href="index.html#form"', 'href="/#form"')
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {fpath}")
