---
metadata:
  - name: generator
    content: Diplodoc Platform v5.54.4
alternate:
  - https://yandex.ru/dev/games/doc/en/sdk/sdk-about.md
  - https://yandex.ru/dev/games/doc/hi/sdk/sdk-about.md
  - https://yandex.ru/dev/games/doc/ko/sdk/sdk-about.md
  - https://yandex.ru/dev/games/doc/ru/sdk/sdk-about.md
  - https://yandex.ru/dev/games/doc/tr/sdk/sdk-about.md
  - https://yandex.ru/dev/games/doc/vi/sdk/sdk-about.md
  - https://yandex.ru/dev/games/doc/zh/sdk/sdk-about.md
  - href: ru/sdk/sdk-about.md
    type: text/markdown
    title: Markdown version
  - href: ../llms.txt
    type: text/markdown
    title: llms.txt
---
> **Documentation Index:** Fetch the complete configuration index at https://yandex.ru/dev/games/doc/ru/llms.txt

# РџРѕРґРєР»СЋС‡РµРЅРёРµ Рё РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ

<!-- source: ru/_includes/script-common.md -->
<!-- source: ru/_includes/script/index-js.md -->

<!-- endsource: ru/_includes/script/index-js.md -->

<!-- source: ru/_includes/script/requirements-js.md -->

<!-- endsource: ru/_includes/script/requirements-js.md -->

<!-- source: ru/_includes/script/image-modal-js.md -->

<!-- endsource: ru/_includes/script/image-modal-js.md -->


<!-- source: ru/_includes/script/neuroexpert-widget.md -->



<!-- endsource: ru/_includes/script/neuroexpert-widget.md -->
<!-- endsource: ru/_includes/script-common.md -->

## РџРѕРґРєР»СЋС‡РµРЅРёРµ {#connect}

{% note alert %}

Р§С‚РѕР±С‹ РІР°С€Р° РёРіСЂР° СѓСЃРїРµС€РЅРѕ РїСЂРѕС€Р»Р° РјРѕРґРµСЂР°С†РёСЋ, СѓРєР°Р¶РёС‚Рµ Р°РєС‚СѓР°Р»СЊРЅС‹Р№ РїСѓС‚СЊ РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ SDK РЇРЅРґРµРєСЃ&nbsp;РРіСЂ:

- Р•СЃР»Рё РІС‹ Р·Р°РіСЂСѓР¶Р°РµС‚Рµ Р°СЂС…РёРІ РёРіСЂС‹ РЅР° СЃРµСЂРІРµСЂ РЇРЅРґРµРєСЃР° С‡РµСЂРµР· [РљРѕРЅСЃРѕР»СЊ СЂР°Р·СЂР°Р±РѕС‚С‡РёРєР°](https://games.yandex.ru/console){.external}, СѓРєР°Р¶РёС‚Рµ [РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Р№ РїСѓС‚СЊ](#yandex-server). Р­С‚Рѕ СЂРµРєРѕРјРµРЅРґСѓРµРјС‹Р№ РІР°СЂРёР°РЅС‚.
- Р•СЃР»Рё РІС‹ РёСЃРїРѕР»СЊР·СѓРµС‚Рµ РёРЅС‚РµРіСЂР°С†РёСЋ С‡РµСЂРµР· СЃРІРѕР№ РґРѕРјРµРЅ, СѓРєР°Р¶РёС‚Рµ [Р°Р±СЃРѕР»СЋС‚РЅС‹Р№ РїСѓС‚СЊ](#iframe).

{% endnote %}

РџРѕРґРєР»СЋС‡РёС‚СЊ SDK РЇРЅРґРµРєСЃ&nbsp;РРіСЂ РјРѕР¶РЅРѕ РґРІСѓРјСЏ СЂР°РІРЅРѕРїСЂР°РІРЅС‹РјРё СЃРїРѕСЃРѕР±Р°РјРё:

- Р§РµСЂРµР· С‚РµРі `
    ```

    РСЃРїРѕР»СЊР·СѓР№С‚Рµ Р°С‚СЂРёР±СѓС‚С‹:

    - `async` вЂ” РґР»СЏ РЅРµР±Р»РѕРєРёСЂСѓСЋС‰РµР№ Р·Р°РіСЂСѓР·РєРё.
    - `onload` вЂ” РґР»СЏ РІС‹РїРѕР»РЅРµРЅРёСЏ РєРѕРґР° РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЃРєСЂРёРїС‚Р°.

    РџСЂРёРјРµСЂ РєРѕРґР° РґР»СЏ Р·Р°РїСѓСЃРєР° `initSDK` РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЃРєСЂРёРїС‚Р°. `initSDK` РїРѕРґСЂР°Р·СѓРјРµРІР°РµС‚ [РёРЅРёС†РёР°Р»РёР·Р°С†РёСЋ SDK](#use):

    ```html showLineNumbers
    <!-- Yandex Games SDK -->
    
    ```

- Р”РёРЅР°РјРёС‡РµСЃРєР°СЏ Р·Р°РіСЂСѓР·РєР°

    Р”РѕР±Р°РІСЊС‚Рµ РІ СЃРІРѕР№ С‚РµРі `
```

## РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ {#use}

РџРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё СЃРєСЂРёРїС‚Р° РёРЅРёС†РёР°Р»РёР·РёСЂСѓР№С‚Рµ SDK, РёСЃРїРѕР»СЊР·СѓСЏ РјРµС‚РѕРґ `init()` РѕР±СЉРµРєС‚Р° `YaGames`.

{% note tip %}

Р’ `YaGames.init()` Рё [ysdk.getPayments()](https://yandex.ru/dev/games/doc/ru/sdk/sdk-purchases.md#install) РјРѕР¶РЅРѕ РїРµСЂРµРґР°С‚СЊ РѕРїС†РёРѕРЅР°Р»СЊРЅС‹Р№ РїР°СЂР°РјРµС‚СЂ `signed: boolean`, РєРѕС‚РѕСЂС‹Р№ РїСЂРµРґРЅР°Р·РЅР°С‡РµРЅ РґР»СЏ [Р·Р°С‰РёС‚С‹ РѕС‚ РЅР°РєСЂСѓС‚РѕРє](https://yandex.ru/dev/games/doc/ru/sdk/sdk-purchases.md#signature). Р’С‹Р±РѕСЂ Р·РЅР°С‡РµРЅРёСЏ Р·Р°РІРёСЃРёС‚ РѕС‚ С‚РѕРіРѕ, РіРґРµ РѕР±СЂР°Р±Р°С‚С‹РІР°СЋС‚СЃСЏ РїР»Р°С‚РµР¶Рё:

- Р•СЃР»Рё РЅР° СЃС‚РѕСЂРѕРЅРµ РєР»РёРµРЅС‚Р° вЂ” РІС‹Р·РѕРІРёС‚Рµ РјРµС‚РѕРґС‹ Р±РµР· РїР°СЂР°РјРµС‚СЂР° `signed: boolean` РёР»Рё РїРµСЂРµРґР°Р№С‚Рµ `signed: false`. РњРµС‚РѕРґС‹ РїРѕРєСѓРїРѕРє Р±СѓРґСѓС‚ РІРѕР·РІСЂР°С‰Р°С‚СЊ РґР°РЅРЅС‹Рµ РІ РѕС‚РєСЂС‹С‚РѕРј РІРёРґРµ.
- Р•СЃР»Рё РЅР° СЃС‚РѕСЂРѕРЅРµ СЃРµСЂРІРµСЂР° вЂ” РїРµСЂРµРґР°Р№С‚Рµ `signed: true`. Р’ С‚Р°РєРѕРј СЃР»СѓС‡Р°Рµ РІ РѕС‚РІРµС‚Р°С… РјРµС‚РѕРґРѕРІ [payments.getPurchases()](https://yandex.ru/dev/games/doc/ru/sdk/sdk-purchases.md#getpurchases) Рё [payments.purchase()](https://yandex.ru/dev/games/doc/ru/sdk/sdk-purchases.md#payments-purchase) РІСЃРµ РґР°РЅРЅС‹Рµ РІРѕР·РІСЂР°С‰Р°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ РІ Р·Р°С€РёС„СЂРѕРІР°РЅРЅРѕРј РІРёРґРµ РІ РїР°СЂР°РјРµС‚СЂРµ `signature`.

{% endnote %}

{% list tabs %}

- РћР±СЂР°Р±РѕС‚РєР° РЅР° СЃС‚РѕСЂРѕРЅРµ РєР»РёРµРЅС‚Р°

    РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ СЃ РїР°СЂР°РјРµС‚СЂРѕРј РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ (`signed: false`):

    ```javascript
    const ysdk = await YaGames.init();
    ```

- РћР±СЂР°Р±РѕС‚РєР° РЅР° СЃРµСЂРІРµСЂРµ

    РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ СЃ РїР°СЂР°РјРµС‚СЂРѕРј `signed: true`:

    ```javascript
    const ysdk = await YaGames.init({ signed: true });
    ```

{% endlist %}

&nbsp; {.empty}

## РџСЂРѕРІРµСЂРєР° {#check}

{% note warning %}

РЎРєСЂРёРїС‚ `/sdk.js` РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕРґРєР»СЋС‡РµРЅ РґРѕ РІС‹РїРѕР»РЅРµРЅРёСЏ [YaGames.init()](#use).

{% endnote %}

РџСЂРѕРІРµСЂСЊС‚Рµ РїСЂР°РІРёР»СЊРЅРѕСЃС‚СЊ РїРѕРґРєР»СЋС‡РµРЅРёСЏ SDK СЃ РїРѕРјРѕС‰СЊСЋ Р»РѕР°РґРµСЂР°:

1. Р—Р°РїСѓСЃС‚РёС‚Рµ РёРіСЂСѓ СЃ [debug-РїР°РЅРµР»СЊСЋ](https://yandex.ru/dev/games/doc/ru/console/debug-panel.md):

   <!-- source: ru/_includes/requirements/start-debug-panel.md -->
   {% list tabs %}

   - Р§РµСЂРµР· РљРѕРЅСЃРѕР»СЊ СЂР°Р·СЂР°Р±РѕС‚С‡РёРєР°
       1. РћС‚РєСЂРѕР№С‚Рµ [РљРѕРЅСЃРѕР»СЊ РЇРЅРґРµРєСЃ РРіСЂ](https://games.yandex.ru/console){.external}.
       1. Р’С‹Р±РµСЂРёС‚Рµ РЅСѓР¶РЅСѓСЋ РёРіСЂСѓ.
       1. Р’ Р»РµРІРѕРј РІРµСЂС…РЅРµРј СѓРіР»Сѓ РЅР°Р¶РјРёС‚Рµ **РћС‚РєСЂС‹С‚СЊ СЃ debug-РїР°РЅРµР»СЊСЋ**.

   - Р§РµСЂРµР· Р°РґСЂРµСЃРЅСѓСЋ СЃС‚СЂРѕРєСѓ
       1. РћС‚РєСЂРѕР№С‚Рµ РЅСѓР¶РЅСѓСЋ РёРіСЂСѓ.
       1. Р”РѕР±Р°РІСЊС‚Рµ РїР°СЂР°РјРµС‚СЂ `debug-mode=16` РІ РєРѕРЅРµС† Р°РґСЂРµСЃРЅРѕР№ СЃС‚СЂРѕРєРё Р±СЂР°СѓР·РµСЂР°.

          РџСЂРёРјРµСЂ СЃСЃС‹Р»РєРё: `https://yandex.ru/games/app/XXXX?debug-mode=16`, РіРґРµ `XXXX`В вЂ” СѓРЅРёРєР°Р»СЊРЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РёРіСЂС‹.

   {% endlist %}
   <!-- endsource: ru/_includes/requirements/start-debug-panel.md -->

2. Р’ Р»РµРІРѕРј РЅРёР¶РЅРµРј СѓРіР»Сѓ РїСЂРѕРІРµСЂСЊС‚Рµ Р·РЅР°С‡РµРЅРёРµ РёРЅРґРёРєР°С‚РѕСЂР° [Р»РѕР°РґРµСЂР°](https://yandex.ru/dev/games/doc/ru/console/debug-panel.md#loader):

    - `W` вЂ” РѕР¶РёРґР°РµС‚ РёРЅРёС†РёР°Р»РёР·Р°С†РёРё.
    - `IT` вЂ” Р·Р°РіСЂСѓР·С‡РёРє SDK РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ РІРµСЂРЅРѕ.
    - `IF` вЂ” РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ СЃС‚Р°СЂС‹Р№ Р»РѕР°РґРµСЂ. Р—Р°РіСЂСѓР·РёС‚Рµ SDK РІ СЃРѕРѕС‚РІРµС‚СЃС‚РІРёРё СЃ [РґРѕРєСѓРјРµРЅС‚Р°С†РёРµР№](#connect).

## Р РµС€РµРЅРёРµ РїСЂРѕР±Р»РµРј {#faq}

### Uncaught ReferenceError: YaGames is not defined {#yagames-not-defined}

РћР±СЂР°С‚РёС‚Рµ РІРЅРёРјР°РЅРёРµ РЅР° РїРѕСЂСЏРґРѕРє РїРѕРґРєР»СЋС‡РµРЅРёСЏ СЃРєСЂРёРїС‚Р° `sdk`: РѕРЅ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕРґРєР»СЋС‡РµРЅ РґРѕ РІС‹РїРѕР»РЅРµРЅРёСЏ `YaGames.init().`

### Uncaught ReferenceError: ysdk is not defined {#ysdk-not-defined}

Р’С‹ РїРѕРїС‹С‚Р°Р»РёСЃСЊ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РјРµС‚РѕРґС‹ SDK (СЂРµРєР»Р°РјР°, РїРѕРєСѓРїРєРё Рё С‚. Рґ.) РґРѕ РјРѕРјРµРЅС‚Р° РёРЅРёС†РёР°Р»РёР·Р°С†РёРё SDK. РњРѕРјРµРЅС‚ РёРЅРёС†РёР°Р»РёР·Р°С†РёРё РјРѕР¶РЅРѕ РѕС‚СЃР»РµРґРёС‚СЊ РІ debug-СЂРµР¶РёРјРµ РїРѕ СЃРѕРѕР±С‰РµРЅРёСЋ `Initialized` РІ РєРѕРЅСЃРѕР»Рё. Р§С‚РѕР±С‹ РєРѕРЅС‚СЂРѕР»РёСЂРѕРІР°С‚СЊ РїРѕСЂСЏРґРѕРє РІС‹Р·РѕРІРѕРІ, РґРѕР±Р°РІСЊС‚Рµ РёРЅРёС†РёР°Р»РёР·Р°С†РёСЋ SDK РїРµСЂРµРґ РІС‹Р·РѕРІРѕРј РјРµС‚РѕРґР°:

```javascript showLineNumbers
const ysdk = await YaGames.init();

ysdk.adv.showFullscreenAdv();
```

### РџСЂРёРјРµСЂ РїРѕРґРєР»СЋС‡РµРЅРёСЏ SDK {#connection-example}

```html showLineNumbers
<!-- Yandex Games SDK -->


```

---

<!-- source: ru/_includes/sdk-support.md -->
{% note info %}

РЎРѕС‚СЂСѓРґРЅРёРєРё СЃР»СѓР¶Р±С‹ РїРѕРґРґРµСЂР¶РєРё РїРѕРјРѕРіР°СЋС‚ СЂР°Р·РјРµСЃС‚РёС‚СЊ РіРѕС‚РѕРІСѓСЋ РёРіСЂСѓ РЅР°В РїР»Р°С‚С„РѕСЂРјРµ РЇРЅРґРµРєСЃВ РРіСЂ. РќР°В РїСЂРёРєР»Р°РґРЅС‹Рµ РІРѕРїСЂРѕСЃС‹ РѕВ СЂР°Р·СЂР°Р±РѕС‚РєРµ РёВ С‚РµСЃС‚РёСЂРѕРІР°РЅРёРё РїСЂРµРґРјРµС‚РЅРѕ РѕС‚РІРµС‚СЏС‚ РґСЂСѓРіРёРµ СЂР°Р·СЂР°Р±РѕС‚С‡РёРєРё РІВ [РЎРѕРѕР±С‰РµСЃС‚РІРµ РІ РўРµР»РµРіСЂР°РјРµ](https://t.me/yagamedev){.telegram}.

{% endnote %}

Р•СЃР»Рё РїСЂРё РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРё SDK РЇРЅРґРµРєСЃВ РРіСЂ РІС‹ СЃС‚РѕР»РєРЅСѓР»РёСЃСЊ СЃ РїСЂРѕР±Р»РµРјРѕР№ РёР»Рё Сѓ РІР°СЃ РїРѕСЏРІРёР»СЃСЏ РІРѕРїСЂРѕСЃ, РѕР±СЂР°С‚РёС‚РµСЃСЊ РІ СЃР»СѓР¶Р±Сѓ РїРѕРґРґРµСЂР¶РєРё:

<!-- source: ru/_includes/button-chat.md -->
<a href="https://yandex.ru/chat/#/user/774df508-c12d-9d6e-6a27-5e3fc522016a">
  <span class="button">РќР°РїРёСЃР°С‚СЊ РІ С‡Р°С‚</span>
</a>
<!-- endsource: ru/_includes/button-chat.md -->
<!-- endsource: ru/_includes/sdk-support.md -->

