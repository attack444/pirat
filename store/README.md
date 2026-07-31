# Публикация: веб · iOS · Android

Три версии одной игры:

| Версия | Как выглядит | Как собрать / открыть |
|--------|--------------|------------------------|
| **Веб** | Деревянная рамка-«окошко», PWA, fullscreen-кнопка | Открыть `index.html` / задеплоить статику |
| **Android** | Без рамки, safe-area, D-pad, haptics | `npm run android` → Android Studio → AAB |
| **iOS** | Без рамки, safe-area, D-pad, haptics | На Mac: `npm run ios` → Xcode → Archive |

Предпросмотр нативного UI в браузере:
- `index.html?platform=android`
- `index.html?platform=ios`

## Обязательно до отправки в магазины
1. Задеплойте сайт на **HTTPS** (веб + `privacy-policy.html`).
2. В Play Console / App Store Connect укажите **URL политики конфиденциальности**.
3. Заполните формы по гайдам:
   - [GOOGLE_PLAY.md](./GOOGLE_PLAY.md) — Data safety, IARC, listing
   - [APP_STORE.md](./APP_STORE.md) — App Privacy, Age Rating, Review notes
4. Сделайте **реальные скриншоты** с эмулятора/устройства (не оставляйте заглушки).
5. Замените контакт `privacy@pirat2048.example` на свой e-mail в `privacy-policy.html`.

## Графика
Сгенерированные ассеты лежат в `store/assets/`:
- `app-store-icon-1024.png` — иконка App Store (без прозрачности)
- `feature-graphic.png` — Google Play Feature Graphic 1024×500
- `splash-2732.png` — универсальный splash

Иконки PWA — в `/icons/`.
