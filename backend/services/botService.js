import Settings from '../models/Settings.js';
import Girl from '../models/Girl.js';

export const BOT_STATES = {
  GREET: 'greet',
  ASKING_CITY: 'asking_city',
  PICKING_GIRL: 'picking_girl',
  GIRL_SELECTED: 'girl_selected',
  WAITING: 'waiting'
};

export class BotService {
  static async processMessage(chat, userMessage) {
    const { step, context } = chat.botState;
    const settings = await Settings.get();
    
    let nextStep = step;
    let botReply = null;
    let quickReplies = null;
    let shouldHandoff = false;

    switch (step) {
      case BOT_STATES.GREET:
        botReply = settings.botMessages.greet;
        quickReplies = ['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск'];
        nextStep = BOT_STATES.ASKING_CITY;
        break;

      case BOT_STATES.ASKING_CITY:
        const city = userMessage?.trim();
        if (city && Girl.schema.path('city').enumValues.includes(city)) {
          const girls = await Girl.find({ city, isOnline: true }).limit(5);
          if (girls.length > 0) {
            botReply = `💫 В ${city} доступно ${girls.length} анкет. Выбери:`;
            quickReplies = girls.map(g => ({ 
              text: `${g.name}, ${g.age} ⭐${g.rating}`, 
              value: g._id.toString() 
            }));
            nextStep = BOT_STATES.PICKING_GIRL;
            context.set('selectedCity', city);
          } else {
            botReply = '😔 Пока нет свободных анкет в этом городе. Попробуй другой:';
            quickReplies = ['Москва', 'СПб', 'Казань'];
          }
        } else {
          botReply = settings.botMessages.cityPrompt;
          quickReplies = ['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск'];
        }
        break;

      case BOT_STATES.PICKING_GIRL:
        const girlId = userMessage?.payload?.value || userMessage;
        const girl = await Girl.findById(girlId);
        if (girl) {
          botReply = `✨ ${girl.name} приняла ваш запрос!\n${settings.botMessages.girlSelected}`;
          nextStep = BOT_STATES.WAITING;
          context.set('selectedGirl', girlId);
          shouldHandoff = true;
        } else {
          botReply = '❌ Анкета не найдена. Выбери другую:';
          const girls = await Girl.find({ city: context.get('selectedCity'), isOnline: true }).limit(3);
          quickReplies = girls.map(g => ({ text: `${g.name}, ${g.age}`, value: g._id.toString() }));
        }
        break;

      case BOT_STATES.WAITING:
        botReply = '⏳ Оператор скоро подключится...';
        break;
    }

    return { nextStep, botReply, quickReplies, shouldHandoff, context };
  }

  static reset(chat) {
    chat.botState = { step: BOT_STATES.GREET, context: new Map() };
    return chat.save();
  }
}