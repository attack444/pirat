// ======================== Рынок у рифа (магазин) ========================
// Чистая, тестируемая логика магазина: каталог, покупки, бусты и перки.
// Модуль не трогает DOM и не обращается к window/localStorage — только state.
// Категории предметов:
//   boost — расходник (копятся в state.inventory[ключ] = число),
//   perk  — одноразовый (state.perks[ключ] = true),
//   skin  — скин плиток (state.unlockedSkins), у скинов есть игровой бонус (+% очков),
//   theme — тема оформления (state.unlockedThemes), у тем тоже есть бонус (+% очков).

export const SHOP_ITEMS = [
    // ── Бусты (расходники) ──
    { id: 'boost_shuffle', type: 'boost', key: 'shuffle',   icon: '🔄', name: 'Перемешать',    desc: 'Перемешивает плитки на доске — новый шанс на ход',           price: 30 },
    { id: 'boost_bomb',    type: 'boost', key: 'bomb',      icon: '💣', name: 'Бомба',         desc: 'Убирает наименьшую плитку — расчищает место для роста',     price: 60 },
    { id: 'boost_x2',      type: 'boost', key: 'x2',        icon: '⚡', name: 'Тройные очки',  desc: 'Следующие 3 хода со слиянием дают ×3 очков',                price: 120, mult: 3 },
    { id: 'boost_lightning', type: 'boost', key: 'lightning', icon: '💫', name: 'Молния',      desc: 'Убирает 3 наименьшие плитки разом — мощная расчистка',        price: 150 },

    // ── Перки (одноразовые) ──
    { id: 'perk_coinBonus',  type: 'perk', key: 'coinBonus',  icon: '🦪', name: 'Жемчужная жила', desc: '+50% жемчужин за все награды',                            price: 800 },
    { id: 'perk_bonusTile',  type: 'perk', key: 'bonusTile',  icon: '📦', name: 'Бонусная плитка', desc: 'Новая партия начинается с плиткой 4',                      price: 600 },
    { id: 'perk_bonusTile8', type: 'perk', key: 'bonusTile8', icon: '🐚', name: 'Глубокий старт', desc: 'Новая партия начинается с плиткой 8 (заменяет плитку 4)',    price: 1200 },
    { id: 'perk_fourChance', type: 'perk', key: 'fourChance', icon: '🎲', name: 'Дух четвёрки',   desc: 'Шанс выпадения плитки 4 вырастает до 30%',                    price: 1500 },
    { id: 'perk_tideSlow',   type: 'perk', key: 'tideSlow',   icon: '🧘', name: 'Спокойные воды', desc: 'Прилив наступает на 1 ход позже',                           price: 2000 },
    { id: 'perk_extraUndos', type: 'perk', key: 'extraUndos', icon: '♻️', name: 'Доп. отмены',     desc: '+3 бесплатных отмены хода в день',                           price: 500 },

    // ── Скины плиток (дарят +% очков) ──
    { id: 'skin_gold',   type: 'skin', key: 'gold',   icon: '🦪', name: 'Жемчуг',           price: 0,    base: true, bonus: 0 },
    { id: 'skin_wood',   type: 'skin', key: 'wood',   icon: '🪵', name: 'Коралл',           price: 300,  bonus: 5 },
    { id: 'skin_gem',    type: 'skin', key: 'gem',    icon: '💎', name: 'Кристаллы',        price: 600,  bonus: 10 },
    { id: 'skin_ice',    type: 'skin', key: 'ice',    icon: '🧊', name: 'Айсберг',          price: 800,  bonus: 15 },
    { id: 'skin_fire',   type: 'skin', key: 'fire',   icon: '🔥', name: 'Вулкан',           price: 800,  bonus: 15 },
    { id: 'skin_storm',  type: 'skin', key: 'storm',  icon: '🌊', name: 'Буря',             price: 800,  bonus: 20 },
    { id: 'skin_pearl',  type: 'skin', key: 'pearl',  icon: '🐚', name: 'Жемчужина глубин', price: 10000, bonus: 25, legendary: true },
    { id: 'skin_abyss',  type: 'skin', key: 'abyss',  icon: '🕳️', name: 'Бездна',           price: 25000, bonus: 30, legendary: true },
    { id: 'skin_kraken', type: 'skin', key: 'kraken', icon: '🐙', name: 'Кракен',           price: 50000, bonus: 50, legendary: true },

    // ── Темы оформления (тоже дают +% очков) ──
    { id: 'theme_dark',   type: 'theme', key: 'dark',   icon: '🌙', name: 'Бездна',   price: 0,    base: true, bonus: 0 },
    { id: 'theme_light',  type: 'theme', key: 'light',  icon: '☀️', name: 'Лагуна',   price: 250,  bonus: 5 },
    { id: 'theme_forest', type: 'theme', key: 'forest', icon: '🌲', name: 'Лес',      price: 450,  bonus: 10 },
    { id: 'theme_sunset', type: 'theme', key: 'sunset', icon: '🌅', name: 'Закат',    price: 1500, bonus: 15 },
    { id: 'theme_abyss',  type: 'theme', key: 'abyss',  icon: '🌌', name: 'Глубина',  price: 5000, bonus: 20 },
];

/** Предмет по id (или null). */
export function getShopItem(id) {
    return SHOP_ITEMS.find(i => i.id === id) || null;
}

/** Предметы категории (boost / perk / skin / theme). */
export function itemsByType(type) {
    return SHOP_ITEMS.filter(i => i.type === type);
}

/**
 * Владение предметом:
 *  boost — есть хотя бы 1 единица в запасе;
 *  perk  — флаг в state.perks;
 *  skin/theme — в разблокированном списке.
 */
export function ownsItem(state, item) {
    if (!state || !item) return false;
    if (item.type === 'boost') return ((state.inventory || {})[item.key] || 0) > 0;
    if (item.type === 'perk')  return !!((state.perks || {})[item.key]);
    if (item.type === 'skin')  return (state.unlockedSkins || []).includes(item.key);
    if (item.type === 'theme') return (state.unlockedThemes || []).includes(item.key);
    return false;
}

/** Можно ли купить: хватает жемчужин, и предмет ещё не открыт (для не-расходников). */
export function canAfford(state, item) {
    if (!state || !item) return false;
    if (item.type !== 'boost' && ownsItem(state, item)) return false;
    return (state.doubloons || 0) >= (item.price || 0);
}

/**
 * Покупка предмета. Мутирует state.
 * @returns {{ok:true, item} | {ok:false, reason:'no_item'|'owned'|'not_enough'}}
 */
export function buyItem(state, item) {
    if (!state || !item) return { ok: false, reason: 'no_item' };
    if (item.type !== 'boost' && ownsItem(state, item)) return { ok: false, reason: 'owned' };
    if ((state.doubloons || 0) < (item.price || 0)) return { ok: false, reason: 'not_enough' };

    state.doubloons = (state.doubloons || 0) - item.price;

    if (item.type === 'boost') {
        state.inventory = state.inventory || {};
        state.inventory[item.key] = (state.inventory[item.key] || 0) + 1;
    } else if (item.type === 'perk') {
        state.perks = state.perks || {};
        state.perks[item.key] = true;
    } else if (item.type === 'skin') {
        state.unlockedSkins = [...new Set([...(state.unlockedSkins || []), item.key])];
    } else if (item.type === 'theme') {
        state.unlockedThemes = [...new Set([...(state.unlockedThemes || []), item.key])];
    }

    return { ok: true, item };
}

/** Использовать буст (списать 1 единицу). Возвращает true, если буст был. */
export function useBoost(state, key) {
    if (!state) return false;
    state.inventory = state.inventory || {};
    if ((state.inventory[key] || 0) <= 0) return false;
    state.inventory[key] = state.inventory[key] - 1;
    return true;
}

/** Есть ли буст в запасе. */
export function hasBoost(state, key) {
    return !!state && ((state.inventory || {})[key] || 0) > 0;
}

/** Текущий запас буста. */
export function boostCount(state, key) {
    return state ? ((state.inventory || {})[key] || 0) : 0;
}

/** Куплен ли перк. */
export function ownsPerk(state, key) {
    return !!state && !!((state.perks || {})[key]);
}

/** Множитель наград за жемчужины (перк «Жемчужная жила»): 1.5 или 1. */
export function coinMultiplier(state) {
    return ownsPerk(state, 'coinBonus') ? 1.5 : 1;
}

/** Итоговая награда жемчужин с учётом перка «Жемчужная жила» (+50%). */
export function applyCoinReward(state, n) {
    const base = Math.max(0, Math.floor(Number(n) || 0));
    return Math.round(base * coinMultiplier(state));
}

/** Дневной лимит бесплатных отмен хода с учётом перка «Доп. отмены» (+3). */
export function effectiveUndoLimit(state, baseLimit) {
    return (Number(baseLimit) || 0) + (ownsPerk(state, 'extraUndos') ? 3 : 0);
}

// ──────────────────────────────────────────────────────────────
// Бонусы скинов и тем: косметика теперь даёт реальный игровой эффект
// (+% очков за слияния). Чистые функции — тестируемые.
// ──────────────────────────────────────────────────────────────

/** Предмет (скин/тема) по ключу, активный у игрока. */
export function itemByKey(type, key) {
    return SHOP_ITEMS.find(i => i.type === type && i.key === key) || null;
}

/** Бонус активного скина в процентах (0, если скин не найден/не куплен). */
export function skinBonus(state) {
    if (!state) return 0;
    const skin = itemByKey('skin', state.skin);
    if (!skin || !(state.unlockedSkins || []).includes(skin.key)) return 0;
    return skin.bonus || 0;
}

/** Бонус активной темы в процентах (0, если тема не найдена/не куплена). */
export function themeBonus(state) {
    if (!state) return 0;
    const theme = itemByKey('theme', state.theme);
    if (!theme || !(state.unlockedThemes || []).includes(theme.key)) return 0;
    return theme.bonus || 0;
}

/**
 * Итоговый множитель очков от скина + темы.
 * Например, скин +20% и тема +10% → множитель 1.30.
 */
export function appearanceScoreMultiplier(state) {
    return 1 + (skinBonus(state) + themeBonus(state)) / 100;
}

/** Суммарный бонус скина + темы в процентах (для подсказок в UI). */
export function appearanceBonusPercent(state) {
    return skinBonus(state) + themeBonus(state);
}
