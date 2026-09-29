import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('<div id="view-home"')
end = data.find('<!-- END HOME VIEW -->')

home_html = data[start:end]

open_divs = len(re.findall(r'<div', home_html))
close_divs = len(re.findall(r'</div', home_html))

print(f"Open divs: {open_divs}")
print(f"Close divs: {close_divs}")
print(f"Difference: {open_divs - close_divs}")
