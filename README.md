# 🏴‍☠️ Пират 2048

Классическая головоломка 2048 в пиратском стиле — **три версии**: веб, iOS и Android.

## Версии

| Платформа | Внешний вид | Запуск |
|-----------|-------------|--------|
| **Веб / PWA** | Деревянная рамка-«окошко», кнопка fullscreen | Открыть `index.html` или задеплоить статику |
| **Android** | Без рамки, safe-area, D-pad, вибрация | `npm run android` |
| **iOS** | Без рамки, safe-area, D-pad, вибрация | На Mac: `npm run ios` |

Предпросмотр нативного UI в браузере: `?platform=ios` или `?platform=android`.

## Возможности

- Свайпы + экранный D-pad + стрелки / WASD
- 7 уровней (ранги от Юнги до Пиратского Короля), поля 4×4 → 6×6
- Прогресс в `localStorage`
- Полный экран (веб)
- PWA offline (веб)
- Capacitor: StatusBar, SplashScreen, Haptics, Android back button

## Быстрый старт (веб)

```bash
npx serve . -p 4173
# открыть http://localhost:4173
```

## Сборка магазинов

```bash
npm install
npm run sync          # www/ + cap sync android/ios
npm run android       # Android Studio → Generate Signed Bundle (AAB)
npm run ios           # только macOS + Xcode → Archive
```

Package / Bundle ID: `com.pirat.game2048`

Подробные чеклисты модерации:
- [`store/GOOGLE_PLAY.md`](store/GOOGLE_PLAY.md) — Data safety, IARC, listing
- [`store/APP_STORE.md`](store/APP_STORE.md) — App Privacy, Age Rating, Review notes
- [`store/README.md`](store/README.md) — обзор публикации
- [`privacy-policy.html`](privacy-policy.html) — **обязательно задеплоить на HTTPS**

## Структура

```
pirat/
├── index.html              # Веб-вход
├── privacy-policy.html     # Политика конфиденциальности (для магазинов)
├── manifest.json / sw.js   # PWA (только веб)
├── css/styles.css          # Веб + нативные стили (body.is-native)
├── js/
│   ├── main.js             # Оркестрация: DOM, UI, игровой цикл
│   ├── game.js             # Логика 2048
│   ├── levels.js           # Уровни (данные + levelById/isLastLevel)
│   ├── achievements.js     # Достижения (данные + evaluateAchievements)
│   ├── daily.js            # Ежедневные задания (roll/ensure/metric/check)
│   ├── rewards.js          # Наградная реклама (rewarded revive)
│   ├── combo.js            # Серии/комбо (streak/combo)
│   ├── cloud-sync.js       # Конфликт облачных/локальных сохранений
│   ├── progress.js         # Разблокировка уровней/рекорды
│   ├── platform.js         # web / ios / android
│   ├── platform-sdk.js     # Адаптер VK Mini Apps / Яндекс Игры / Web
│   ├── sound.js            # Звуки (Web Audio)
│   ├── native-entry.js     # Бандл для Capacitor
│   └── native-plugins.js
├── js/*.test.js            # Юнит-тесты (node:test): 128/128
├── scripts/build-www.js    # Сборка www/
├── android/                # Capacitor Android
├── ios/                    # Capacitor iOS (сборка на Mac)
├── store/                  # Чеклист, гайды и графика для магазинов
└── capacitor.config.json
```

## Важно до отправки в Google Play / App Store

1. Залейте сайт и `privacy-policy.html` на **HTTPS**
2. Укажите URL политики в консолях магазинов
3. Privacy Policy: https://pirat-eta.vercel.app/privacy-policy.html (`slavasundukov887@gmail.com`)
4. Сделайте реальные скриншоты с устройств
5. Заполните Data safety / App Privacy как «данные не собираются»

## Лицензия

Образовательный проект. Оригинальная механика 2048 — Gabriele Cirulli.
