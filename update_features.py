import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Remove AI Tutor tile
ai_tile_regex = r'<!-- AI Tutor full-width tile -->.*?</div>\s*</div>\s*</div>'
data = re.sub(ai_tile_regex, '', data, flags=re.DOTALL)

# 2. Remove ai-modal
ai_modal_regex = r'<div id="ai-modal".*?<!-- Subject Selection Modal -->'
data = re.sub(ai_modal_regex, '<!-- Subject Selection Modal -->', data, flags=re.DOTALL)

# 3. Remove sendAiMessage function
send_ai_regex = r'function sendAiMessage\(\) \{.*?\n        \}'
data = re.sub(send_ai_regex, '', data, flags=re.DOTALL)

# 4. Add Duolingo style mistake correction
old_error_block = r"""                    feed\.innerHTML = `<span class="text-\[#ff6b6b\] font-black">\$\{cur\.exp\}</span>`;
                    btn\.style\.background = 'linear-gradient\(135deg, #ff4b4b, #e03030\)';
                    btn\.style\.borderBottom = '3px solid #c02020';
                    btn\.innerText = "ПОНЯТНО →";
                    if \(tg\?\.HapticFeedback\) tg\.HapticFeedback\.notificationOccurred\("error"\);
                \}"""

new_error_block = r"""                    feed.innerHTML = `<span class="text-[#ff6b6b] font-black">${cur.exp}</span>`;
                    btn.style.background = 'linear-gradient(135deg, #ff4b4b, #e03030)';
                    btn.style.borderBottom = '3px solid #c02020';
                    btn.innerText = "ПОНЯТНО →";
                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
                    quizBatch.push(cur);
                }"""

data = re.sub(old_error_block, new_error_block, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Modifications done!")
