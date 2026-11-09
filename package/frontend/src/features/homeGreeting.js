const night = [
  { zh: ['夜深了。', '想重温哪一页？'], en: ['It’s late.', 'Anything you’d like to revisit?'] },
  { zh: ['晚安呀。', '睡前翻两页？'], en: ['One more page?', 'A little time with an old favorite.'] },
  { zh: ['还醒着呀。', '挑一页喜欢的，慢慢看。'], en: ['Still up?', 'Take your time with a favorite.'] },
]

const periods = [
  { until: 6, greetings: night },
  { until: 11, greetings: [
    { zh: ['早安。', '今天想看点什么？'], en: ['Good morning.', 'What would you like to see today?'] },
    { zh: ['早呀。', '趁早晨还安静，翻翻收藏吧。'], en: ['Morning.', 'A quiet moment to browse.'] },
    { zh: ['来杯咖啡？', '刚好有时间翻翻收藏。'], en: ['Coffee first?', 'Then a little time with your collection.'] },
  ] },
  { until: 14, greetings: [
    { zh: ['午安。', '午休时想翻哪一页？'], en: ['Lunch break?', 'What shall we browse for a few minutes?'] },
    { zh: ['午间歇一歇。', '挑点喜欢的，慢慢看。'], en: ['Time for a break.', 'Find a favorite and take your time.'] },
    { zh: ['嗨，回来啦。', '一起翻两页吧。'], en: ['Hey, welcome back.', 'Shall we turn a few pages?'] },
  ] },
  { until: 18, greetings: [
    { zh: ['下午好。', '有什么想再看一遍的？'], en: ['Good afternoon.', 'Anything you’d like to see again?'] },
    { zh: ['喝杯咖啡？', '顺便逛逛收藏馆。'], en: ['Fancy a coffee?', 'Stay and browse for a bit.'] },
    { zh: ['歇一小会儿。', '想翻旧收藏，还是看看刚存的？'], en: ['Take a moment.', 'An old favorite or a recent find?'] },
  ] },
  { until: 23, greetings: [
    { zh: ['晚上好。', '今晚想看点什么？'], en: ['Good evening.', 'What are you in the mood for tonight?'] },
    { zh: ['回来啦。', '要不要翻翻今天的收藏？'], en: ['Welcome back.', 'Want to look through today’s saves?'] },
    { zh: ['今天辛苦了。', '给自己留点时间，看看喜欢的。'], en: ['Long day?', 'Make a little time for a favorite.'] },
  ] },
  { until: 24, greetings: night },
]

export function pickHomeGreeting(now = new Date()) {
  const hour = now.getHours()
  const { greetings } = periods.find(({ until }) => hour < until)
  return greetings[Math.floor(Math.random() * greetings.length)]
}
