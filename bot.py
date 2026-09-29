import os
from telebot import TeleBot, types

# Токен берется безопасно, он не попадет в GitHub!
# Обязательно вставь свой токен в файл .env
try:
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("BOT_TOKEN="):
                TOKEN = line.strip().split("=")[1]
                break
except FileNotFoundError:
    print("Файл .env не найден! Создай его и добавь строку BOT_TOKEN=твой_токен")
    exit(1)

bot = TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    # Создаем клавиатуру с кнопкой Web App
    markup = types.InlineKeyboardMarkup()
    
    # Ссылка на твой GitHub Pages
    web_app = types.WebAppInfo("https://ximeexd.github.io/examflow/")
    
    # Создаем саму кнопку
    btn = types.InlineKeyboardButton("🚀 Запустить ExamFlow", web_app=web_app)
    markup.add(btn)
    
    # Приветственное сообщение
    welcome_text = (
        "👋 Привет, чемпион!\n\n"
        "Добро пожаловать в **ExamFlow** — твой личный тренажер для подготовки к ОГЭ и ЕГЭ.\n\n"
        "Нажми на кнопку ниже, чтобы начать 👇"
    )
    
    bot.send_message(message.chat.id, welcome_text, reply_markup=markup, parse_mode="Markdown")

if __name__ == '__main__':
    print("🤖 Бот запущен! Нажми Ctrl+C для остановки.")
    bot.infinity_polling()
