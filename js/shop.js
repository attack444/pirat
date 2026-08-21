// ======================== Рынок у рифа (магазин) ========================
// Чистая, тестируемая логика магазина: каталог, покупки, бусты и перки.
// Модуль не трогает DOM и не обращается к window/localStorage — только state.
// Категории предметов:
//   boost — расходник (копятся в state.inventory[ключ] = число),
//   perk  — одноразовый (state.perks[ключ] = true),
//   skin  — скин плиток (state.unlockedSkins),
//   theme — тема оформления (state.unlockedThemes).

export const SHOP_ITEMS = [
    // ── Бусты (расходники) ──
    { id: 'boost_shuffle', type: 'boost', key: 'shuffle', icon: '🔄', name: 'Перемешать',   desc: 'Перемешивает плитки на доске — новый шанс на ход', price: 30 },
    { id: 'boost_bomb',    type: 'boost', key: 'bomb',    icon: '💣', name: 'Бомба',        desc: 'Убирает самую большую плитку с доски',               price: 60 },
    { id: 'boost_x2',      type: 'boost', key: 'x2',      icon: '⚡', name: 'Двойные очки', desc: 'Следующие 3 хода со слиянием дают ×2 очков',        price: 90 },

    // ── Перки (одноразовые) ──
    { id: 'perk_coinBonus',  type: 'perk', key: 'coinBonus',  icon: '🦪', name: 'Жемчужная жила', desc: '+50% жемчужин за все награды',                  price: 800 },
    { id: 'perk_bonusTile',  type: 'perk', key: 'bonusTile',  icon: '📦', name: 'Бонусная плитка', desc: 'Каждая новая партия начинается с плиткой 4', price: 600 },
    { id: 'perk_extraUndos', type: 'perk', key: 'extraUndos', icon: '♻️', name: 'Доп. отмены',     desc: '+3 бесплатных отмены хода в день',             price: 500 },

    // ── Скины плиток ──
    { id: 'skin_gold',  type: 'skin',  key: 'gold',  icon: '🦪', name: 'Жемчуг',     price: 0,   base: true },
    { id: 'skin_wood',  type: 'skin',  key: 'wood',  icon: '🪵', name: 'Коралл',     price: 300 },
    { id: 'skin_gem',   type: 'skin',  key: 'gem',   icon: '💎', name: 'Кристаллы',  price: 600 },
    { id: 'skin_ice',   type: 'skin',  key: 'ice',   icon: '🧊', name: 'Айсберг',    price: 800 },
    { id: 'skin_fire',  type: 'skin',  key: 'fire',  icon: '🔥', name: 'Вулкан',     price: 800 },
    { id: 'skin_storm', type: 'skin',  key: 'storm', icon: '🌊', name: 'Буря',       price: 800 },

    // ── Темы оформления ──
    { id: 'theme_dark',   type: 'theme', key: 'dark',   icon: '🌙', name: 'Бездна',  price: 0,   base: true },
    { id: 'theme_light',  type: 'theme', key: 'light',  icon: '☀️', name: 'Лагуна',  price: 250 },
    { id: 'theme_forest', type: 'theme', key: 'forest', icon: '🌲', name: 'Лес',     price: 450 },
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
