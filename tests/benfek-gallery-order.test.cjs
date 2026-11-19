require('reflect-metadata');
require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SupplementRepository } = require('../src/repositories/supplement.repository');

function matches(item, where) {
  if (where.AND && !where.AND.every(part => matches(item, part))) return false;
  if (where.OR && !where.OR.some(part => matches(item, part))) return false;
  if (where.NOT && matches(item, where.NOT)) return false;
  for (const field of ['userId', 'price', 'stock', 'status', 'name']) {
    if (!(field in where)) continue;
    const value = where[field];
    if (value && typeof value === 'object') {
      if ('gt' in value && !(item[field] > value.gt)) return false;
      if ('not' in value && item[field] === value.not) return false;
      if ('contains' in value && !item[field].toLowerCase().includes(value.contains.toLowerCase())) return false;
    } else if (item[field] !== value) return false;
  }
  if (where.user?.is?.role && item.user.role !== where.user.is.role) return false;
  return true;
}

function harness({ principalId = 10, pharmacy = null, pharmacyOwners = [20], items } = {}) {
  const product = (id, userId, date, extra = {}) => ({ id, userId, name: `Product ${id}`, price: 1000, stock: 5, status: 'in_stock',
    createdAt: new Date(date), user: { role: userId === 30 ? 'researcher' : 'principal', showPricesToBenfeks: true }, ...extra });
  const products = items || [
    product(1, 10, '2026-01-01'), product(2, 10, '2026-01-02'), product(3, 10, '2026-01-02'),
    product(4, 20, '2026-11-04'), product(5, 20, '2026-11-05'), product(6, 30, '2026-11-06'),
    product(7, 10, '2026-11-07', { status: 'inactive' }), product(8, 10, '2026-11-08', { stock: 0 }),
    product(9, 10, '2026-11-09', { price: 0 }), product(10, 99, '2026-11-10'),
  ];
  const calls = [];
  const repository = new SupplementRepository({
    user: { findUnique: async () => ({ preferredPharmacyName: pharmacy, preferredPharmacyPhone: null }),
      findMany: async () => pharmacyOwners.map(id => ({ id })) },
    quizCode: { findFirst: async () => principalId ? { createdBy: principalId } : null },
    supplement: {
      count: async ({ where }) => products.filter(item => matches(item, where)).length,
      findMany: async options => {
        calls.push(options);
        assert.deepEqual(options.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
        assert.ok(options.take > 0);
        return products.filter(item => matches(item, options.where))
          .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id).slice(options.skip, options.skip + options.take);
      },
    },
  });
  return { repository, products, calls };
}

test('older principal uploads precede newer pharmacy uploads across all page boundaries', async () => {
  const h = harness({ pharmacy: 'Test Pharmacy' });
  const expected = [3, 2, 1, 5, 4];
  for (const take of [1, 2, 3, 4, 10]) {
    for (let skip = 0; skip <= expected.length + 1; skip++) {
      const result = await h.repository.findBenfekGallery(100, skip, take);
      assert.equal(result.total, expected.length);
      assert.deepEqual(result.items.map(item => item.id), expected.slice(skip, skip + take), `skip=${skip}, take=${take}`);
    }
  }
});

test('principal products precede HLS researcher products when no pharmacy is saved', async () => {
  const h = harness();
  const result = await h.repository.findBenfekGallery(100, 0, 10);
  assert.deepEqual(result.items.map(item => item.id), [3, 2, 1, 6]);
  assert.equal(result.total, 4);
});

test('search and inactive/stock/price filters apply before priority counts and pagination', async () => {
  const h = harness({ pharmacy: 'Test Pharmacy' });
  h.products.find(item => item.id === 1).name = 'Matching supplement';
  h.products.find(item => item.id === 5).name = 'Matching supplement';
  h.products.find(item => item.id === 7).name = 'Matching supplement';
  const first = await h.repository.findBenfekGallery(100, 0, 1, 'Matching');
  const second = await h.repository.findBenfekGallery(100, 1, 1, 'Matching');
  assert.equal(first.total, 2); assert.deepEqual(first.items.map(item => item.id), [1]);
  assert.equal(second.total, 2); assert.deepEqual(second.items.map(item => item.id), [5]);
  assert.deepEqual((await h.repository.findBenfekGallery(100, 0, 10, 'No match')).items, []);
});

test('no eligible principal uploads falls through to the selected pharmacy without adding HLS products', async () => {
  const h = harness({ principalId: 99, pharmacy: 'Test Pharmacy' });
  h.products.find(item => item.id === 10).status = 'inactive';
  const result = await h.repository.findBenfekGallery(100, 0, 10);
  assert.deepEqual(result.items.map(item => item.id), [5, 4]); assert.equal(result.total, 2);
});

test('a principal who is also the selected pharmacy never has products duplicated', async () => {
  const h = harness({ pharmacy: 'Principal Pharmacy', pharmacyOwners: [10] });
  const result = await h.repository.findBenfekGallery(100, 0, 10);
  assert.deepEqual(result.items.map(item => item.id), [3, 2, 1]); assert.equal(result.total, 3);
});

test('unreferred galleries retain newest-first ordering within the eligible pharmacy or HLS source', async () => {
  for (const pharmacy of [null, 'Test Pharmacy']) {
    const h = harness({ principalId: null, pharmacy });
    const result = await h.repository.findBenfekGallery(100, 0, 10);
    assert.deepEqual(result.items.map(item => item.id), pharmacy ? [5, 4] : [6]);
    assert.equal(h.calls.length, 1);
  }
});

test('no matching pharmacy and no referral returns an empty gallery, not global products', async () => {
  const h = harness({ principalId: null, pharmacy: 'Unmatched Pharmacy', pharmacyOwners: [] });
  assert.deepEqual(await h.repository.findBenfekGallery(100, 0, 10), { items: [], total: 0 });
  assert.equal(h.calls.length, 0);
});

test('hidden-price principal products retain priority and their visibility setting', async () => {
  const h = harness({ pharmacy: 'Test Pharmacy' });
  h.products.find(item => item.id === 3).user.showPricesToBenfeks = false;
  const result = await h.repository.findBenfekGallery(100, 0, 1);
  assert.equal(result.items[0].id, 3); assert.equal(result.items[0].user.showPricesToBenfeks, false);
});
