/**
 * Unit tests for the shop / boosts / perks logic (shop.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    SHOP_ITEMS,
    getShopItem,
    itemsByType,
    ownsItem,
    canAfford,
    buyItem,
    useBoost,
    hasBoost,
    boostCount,
    ownsPerk,
    coinMultiplier,
    applyCoinReward,
    effectiveUndoLimit,
} from './shop.js';

function baseState(overrides = {}) {
    return {
        doubloons: 1000,
        inventory: { shuffle: 0, bomb: 1, x2: 0 },
        perks: {},
        unlockedSkins: ['gold'],
        unlockedThemes: ['dark'],
        ...overrides,
    };
}

describe('shop.catalog', () => {
    it('has unique ids across the catalog', () => {
        const ids = SHOP_ITEMS.map(i => i.id);
        assert.equal(new Set(ids).size, ids.length);
    });
    it('has at least one item in every category', () => {
        for (const type of ['boost', 'perk', 'skin', 'theme']) {
            assert.ok(itemsByType(type).length > 0, `category ${type} empty`);
        }
    });
    it('covers the three in-game boosts and three perks', () => {
        assert.deepEqual(itemsByType('boost').map(i => i.key), ['shuffle', 'bomb', 'x2']);
        assert.deepEqual(itemsByType('perk').map(i => i.key), ['coinBonus', 'bonusTile', 'extraUndos']);
    });
    it('getShopItem returns null for unknown ids', () => {
        assert.equal(getShopItem('nope'), null);
    });
});

describe('shop.ownsItem', () => {
    it('boost is owned when inventory count > 0', () => {
        assert.equal(ownsItem(baseState(), getShopItem('boost_bomb')), true);
        assert.equal(ownsItem(baseState(), getShopItem('boost_shuffle')), false);
    });
    it('perk is owned when the flag is set', () => {
        const st = baseState({ perks: { coinBonus: true } });
        assert.equal(ownsItem(st, getShopItem('perk_coinBonus')), true);
        assert.equal(ownsItem(st, getShopItem('perk_bonusTile')), false);
    });
    it('skin / theme ownership follows unlocked lists', () => {
        const st = baseState({ unlockedSkins: ['gold'], unlockedThemes: ['dark', 'light'] });
        assert.equal(ownsItem(st, getShopItem('skin_gold')), true);
        assert.equal(ownsItem(st, getShopItem('skin_ice')), false);
        assert.equal(ownsItem(st, getShopItem('theme_light')), true);
        assert.equal(ownsItem(st, getShopItem('theme_forest')), false);
    });
    it('returns false for missing state or item', () => {
        assert.equal(ownsItem(null, getShopItem('boost_bomb')), false);
        assert.equal(ownsItem(baseState(), null), false);
    });
});

describe('shop.canAfford', () => {
    it('allows buying anything within budget', () => {
        assert.equal(canAfford(baseState(), getShopItem('boost_shuffle')), true);
        assert.equal(canAfford(baseState(), getShopItem('skin_ice')), true);
    });
    it('blocks when doubloons are insufficient', () => {
        assert.equal(canAfford(baseState({ doubloons: 10 }), getShopItem('skin_ice')), false);
    });
    it('blocks re-buying owned non-boost items, but boosts are always purchasable', () => {
        const st = baseState({ unlockedSkins: ['gold', 'wood'] });
        assert.equal(canAfford(st, getShopItem('skin_wood')), false);
        // owned boost with a count is still purchasable (stacks)
        assert.equal(canAfford(baseState(), getShopItem('boost_bomb')), true);
    });
});

describe('shop.buyItem', () => {
    it('buys a boost and increments the inventory', () => {
        const st = baseState({ doubloons: 100 });
        const res = buyItem(st, getShopItem('boost_shuffle'));
        assert.equal(res.ok, true);
        assert.equal(st.doubloons, 70);
        assert.equal(st.inventory.shuffle, 1);
    });
    it('buys a perk exactly once', () => {
        const st = baseState({ doubloons: 800 });
        assert.equal(buyItem(st, getShopItem('perk_coinBonus')).ok, true);
        assert.equal(st.perks.coinBonus, true);
        assert.equal(st.doubloons, 0);
        // second attempt fails as owned
        assert.deepEqual(buyItem(st, getShopItem('perk_coinBonus')), { ok: false, reason: 'owned' });
    });
    it('unlocks skins and themes', () => {
        const st = baseState({ doubloons: 2000 });
        assert.equal(buyItem(st, getShopItem('skin_ice')).ok, true);
        assert.ok(st.unlockedSkins.includes('ice'));
        assert.equal(buyItem(st, getShopItem('theme_forest')).ok, true);
        assert.ok(st.unlockedThemes.includes('forest'));
    });
    it('fails gracefully without enough doubloons', () => {
        const st = baseState({ doubloons: 5 });
        assert.deepEqual(buyItem(st, getShopItem('boost_x2')), { ok: false, reason: 'not_enough' });
    });
    it('handles missing state / item', () => {
        assert.deepEqual(buyItem(null, getShopItem('boost_bomb')), { ok: false, reason: 'no_item' });
        assert.deepEqual(buyItem(baseState(), null), { ok: false, reason: 'no_item' });
    });
});

describe('shop.useBoost / boostCount', () => {
    it('spends exactly one unit', () => {
        const st = baseState();
        assert.equal(useBoost(st, 'bomb'), true);
        assert.equal(st.inventory.bomb, 0);
        assert.equal(useBoost(st, 'bomb'), false);
    });
    it('returns false when the boost is empty', () => {
        const st = baseState();
        assert.equal(useBoost(st, 'shuffle'), false);
        assert.equal(boostCount(st, 'shuffle'), 0);
    });
    it('hasBoost and boostCount report the stash', () => {
        const st = baseState({ inventory: { bomb: 3 } });
        assert.equal(hasBoost(st, 'bomb'), true);
        assert.equal(boostCount(st, 'bomb'), 3);
        assert.equal(hasBoost(st, 'x2'), false);
    });
});

describe('shop.perks (economy)', () => {
    it('coinMultiplier is 1 by default and 1.5 with Жемчужная жила', () => {
        assert.equal(coinMultiplier(baseState()), 1);
        assert.equal(coinMultiplier(baseState({ perks: { coinBonus: true } })), 1.5);
    });
    it('applyCoinReward scales and rounds', () => {
        assert.equal(applyCoinReward(baseState(), 100), 100);
        assert.equal(applyCoinReward(baseState({ perks: { coinBonus: true } }), 100), 150);
        assert.equal(applyCoinReward(baseState({ perks: { coinBonus: true } }), 3), 5);
        assert.equal(applyCoinReward(baseState(), 0), 0);
    });
    it('effectiveUndoLimit adds +3 with the extraUndos perk', () => {
        assert.equal(effectiveUndoLimit(baseState(), 3), 3);
        assert.equal(effectiveUndoLimit(baseState({ perks: { extraUndos: true } }), 3), 6);
    });
    it('ownsPerk mirrors perk flags', () => {
        assert.equal(ownsPerk(baseState(), 'bonusTile'), false);
        assert.equal(ownsPerk(baseState({ perks: { bonusTile: true } }), 'bonusTile'), true);
    });
});
