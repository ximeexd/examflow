import asyncio
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, WebAppInfo
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import ReplyKeyboardBuilder

# !!! ВСТАВЬ СВОЙ ТОКЕН СЮДА !!!
BOT_TOKEN = "8671377787:AAE5ONL_vO246WoWtx4O1FfkR8NhsnxxJWA"

# Сюда мы вставим HTTPS ссылку на твой index.html
WEB_APP_URL = "https://ximeexd.github.io/examflow/" 

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: Message):
    # Создаем кнопку, которая открывает Mini App
    builder = ReplyKeyboardBuilder()
    builder.button(
        text="🔥 Открыть ExamFlow", 
        web_app=WebAppInfo(url=WEB_APP_URL)
    )
    
    await message.answer(
        "Привет! Я бот ExamFlow.\n\nНажми на кнопку ниже, чтобы открыть приложение и начать подготовку!",
        reply_markup=builder.as_markup(resize_keyboard=True)
    )

# Этот кусок кода ловит данные от Web App (когда юзер правильно ответил)
@dp.message(F.web_app_data)
async def web_app_data_handler(message: Message):
    data = message.web_app_data.data
    if data == "win_10xp":
        await message.answer("🎉 Красава! Ты решил задачу и получил +10 XP!")

async def main():
    print("Бот запущен! Жду сообщений...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
