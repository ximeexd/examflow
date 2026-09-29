import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

old_css = r"""\.ambient-bg \{
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background:
                radial-gradient\(ellipse 700px 500px at 5% 0%, rgba\(88, 204, 2, 0\.08\) 0%, transparent 60%\),
                radial-gradient\(ellipse 600px 600px at 95% 45%, rgba\(28, 176, 246, 0\.07\) 0%, transparent 60%\),
                radial-gradient\(ellipse 500px 400px at 50% 100%, rgba\(140, 80, 255, 0\.06\) 0%, transparent 60%\),
                linear-gradient\(180deg, #090e14 0%, #0b1520 100%\);
        \}"""

new_css = r""".ambient-bg {
            position: fixed;
            inset: -50%;
            width: 200%;
            height: 200%;
            z-index: 0;
            pointer-events: none;
            background:
                radial-gradient(ellipse 700px 500px at 30% 25%, rgba(88, 204, 2, 0.08) 0%, transparent 60%),
                radial-gradient(ellipse 600px 600px at 70% 45%, rgba(28, 176, 246, 0.07) 0%, transparent 60%),
                radial-gradient(ellipse 500px 400px at 50% 70%, rgba(140, 80, 255, 0.06) 0%, transparent 60%),
                linear-gradient(180deg, #090e14 0%, #0b1520 100%);
        }
        
        .ambient-bg::after {
            content: '';
            position: absolute;
            inset: 0;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.015) 0, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 10px);
            background-size: 40px 40px, 40px 40px, 100% 100%;
            -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 10%, transparent 90%);
            mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 10%, transparent 90%);
            z-index: 1;
            animation: drift 120s linear infinite;
        }

        @keyframes drift {
            0% { transform: translate(0, 0); }
            100% { transform: translate(-10%, -10%); }
        }"""

data = re.sub(old_css, new_css, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Background updated!")
