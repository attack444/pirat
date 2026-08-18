# Google Play — чеклист публикации «Пират 2048»

## Идентификаторы
| Поле | Значение |
|------|----------|
| Package name | `com.pirat.game2048` |
| App name | Пират 2048 |
| Category | Games → Puzzle |
| Free / Paid | Free |
| Ads | **No** |
| In-app purchases | **No** |

## Data safety (форма в Play Console)
Ответы для приложения без серверов и SDK:

| Вопрос | Ответ |
|--------|--------|
| Does your app collect or share user data? | **No** |
| Is all user data encrypted in transit? | N/A (нет передачи) |
| Do you provide a way for users to request deletion? | Да — удаление приложения |
| Data types collected | **None** |

Локальный прогресс (уровни/очки) хранится только на устройстве и **не считается** «collected» в смысле отправки разработчику.

## Content rating (IARC questionnaire)
Типичные ответы для этой игры:

- Насилие / кровь / оружие реального типа — **No**
- Сексуальный контент — **No**
- Нецензурная лексика — **No**
- Controlled substances — **No**
- Азартные игры / ставки на реальные деньги — **No**
- User interaction / sharing location — **No**
- Online content / unrestricted web — **No** (офлайн-игра)

Ожидаемый рейтинг: **PEGI 3 / Everyone**.

## Target audience & content
- Target age: **All ages** (или 5+)
- Not primarily designed for children under 13 в смысле «Kids» category, но подходит семье
- Appeal to children: **Yes, but not primarily for children** — либо включите Designed for Families при желании

## Store listing (RU)
**Краткое описание (80 символов):**  
Пиратский 2048: 7 уровней, свайпы, без рекламы. Стань Пиратским Королём!

**Полное описание:**
```
🏴☠️ Пират 2048 — классическая головоломка в пиратском стиле.

• 7 уровней: от Юнги до Пиратского Короля
• Поля 4×4, 5×5 и 6×6
• Управление свайпами и кнопками на экране
• Прогресс сохраняется на устройстве
• Без рекламы, без покупок, без интернета

Соединяй одинаковые плитки, набирай очки и открывай новые ранги!
```

## Графика (папка `store/assets/`)
| Ассет | Размер | Файл |
|-------|--------|------|
| App icon | 512×512 | `icon-512.png` (также в `icons/`) |
| Feature graphic | 1024×500 | `feature-graphic.png` |
| Phone screenshots | мин. 2 шт. | готовы: `store/shots/android-*.png` (824×1830): home, moves, shop, shop-skin |
| Tablet (опционально) | 7" / 10" | желательно (пока нет) |

## Технические требования
- Target SDK: **34+** (Capacitor 7 использует актуальный)
- 64-bit ARM (`arm64-v8a`) — обязательно
- Privacy policy URL: `https://5mb2.ru/static/games/pirate-2048/privacy-policy.html`
- App signing: используйте Play App Signing

## Сборка AAB
```bash
npm install
npm run android:add   # один раз
npm run sync
npx cap open android  # Android Studio → Build → Generate Signed Bundle
```

## Частые причины отказа
1. Нет публичного Privacy Policy URL  
2. Скриншоты с телефона другого приложения / обман  
3. Metadata mismatch (заявлены покупки/реклама, а их нет — или наоборот)  
4. Неполный Data safety  
5. Используете чужой бренд «2048» агрессивно в названии — лучше «Пират 2048» / «Pirate Merge 2048»
