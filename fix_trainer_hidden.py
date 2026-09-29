import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# Fix trainer-modal
data = data.replace('id="trainer-modal" class="modal-overlay hidden ', 'id="trainer-modal" class="modal-overlay ')
data = data.replace('id="trainer-modal" class="modal-overlay hidden', 'id="trainer-modal" class="modal-overlay')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Fixed trainer modal hidden class!")
