import re
import subprocess

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

scripts = re.findall(r'<script>(.*?)</script>', data, flags=re.DOTALL)
for i, script in enumerate(scripts):
    with open(f'test_script_{i}.js', 'w', encoding='utf-8') as f:
        f.write(script)
    
    result = subprocess.run(['node', '-c', f'test_script_{i}.js'], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error in script {i}:", result.stderr)
    else:
        print(f"Script {i} is OK")
