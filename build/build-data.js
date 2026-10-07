// 地図・国データを1つの data.js に焼き込む（機内でネットが無くても動くように）
const fs = require('fs');
const path = require('path');
const d3 = require('d3-geo');
const topojson = require('topojson-client');
const countries = require('world-countries');

const r = (n) => Math.round(n * 10) / 10;
function pathFor(proj, feature) {
  const p = d3.geoPath(proj);
  const d = p(feature);
  return d ? d.replace(/-?\d+\.\d+/g, (m) => String(r(+m))) : '';
}

// ---------- 日本 ----------
const PREFS = [
  ['01', '北海道', 'ほっかいどう', '北海道'],
  ['02', '青森県', 'あおもりけん', '東北'], ['03', '岩手県', 'いわてけん', '東北'],
  ['04', '宮城県', 'みやぎけん', '東北'], ['05', '秋田県', 'あきたけん', '東北'],
  ['06', '山形県', 'やまがたけん', '東北'], ['07', '福島県', 'ふくしまけん', '東北'],
  ['08', '茨城県', 'いばらきけん', '関東'], ['09', '栃木県', 'とちぎけん', '関東'],
  ['10', '群馬県', 'ぐんまけん', '関東'], ['11', '埼玉県', 'さいたまけん', '関東'],
  ['12', '千葉県', 'ちばけん', '関東'], ['13', '東京都', 'とうきょうと', '関東'],
  ['14', '神奈川県', 'かながわけん', '関東'],
  ['15', '新潟県', 'にいがたけん', '中部'], ['16', '富山県', 'とやまけん', '中部'],
  ['17', '石川県', 'いしかわけん', '中部'], ['18', '福井県', 'ふくいけん', '中部'],
  ['19', '山梨県', 'やまなしけん', '中部'], ['20', '長野県', 'ながのけん', '中部'],
  ['21', '岐阜県', 'ぎふけん', '中部'], ['22', '静岡県', 'しずおかけん', '中部'],
  ['23', '愛知県', 'あいちけん', '中部'],
  ['24', '三重県', 'みえけん', '近畿'], ['25', '滋賀県', 'しがけん', '近畿'],
  ['26', '京都府', 'きょうとふ', '近畿'], ['27', '大阪府', 'おおさかふ', '近畿'],
  ['28', '兵庫県', 'ひょうごけん', '近畿'], ['29', '奈良県', 'ならけん', '近畿'],
  ['30', '和歌山県', 'わかやまけん', '近畿'],
  ['31', '鳥取県', 'とっとりけん', '中国'], ['32', '島根県', 'しまねけん', '中国'],
  ['33', '岡山県', 'おかやまけん', '中国'], ['34', '広島県', 'ひろしまけん', '中国'],
  ['35', '山口県', 'やまぐちけん', '中国'],
  ['36', '徳島県', 'とくしまけん', '四国'], ['37', '香川県', 'かがわけん', '四国'],
  ['38', '愛媛県', 'えひめけん', '四国'], ['39', '高知県', 'こうちけん', '四国'],
  ['40', '福岡県', 'ふくおかけん', '九州・沖縄'], ['41', '佐賀県', 'さがけん', '九州・沖縄'],
  ['42', '長崎県', 'ながさきけん', '九州・沖縄'], ['43', '熊本県', 'くまもとけん', '九州・沖縄'],
  ['44', '大分県', 'おおいたけん', '九州・沖縄'], ['45', '宮崎県', 'みやざきけん', '九州・沖縄'],
  ['46', '鹿児島県', 'かごしまけん', '九州・沖縄'], ['47', '沖縄県', 'おきなわけん', '九州・沖縄'],
];
const jpTopo = require('jpn-atlas/japan/japan.json');
// jpn-atlas は投影済み（平面座標）なので geoIdentity で並べ直す
const prefFC = topojson.feature(jpTopo, jpTopo.objects.prefectures);
const W = 1000, H = 1000;
const main = { type: 'FeatureCollection', features: prefFC.features.filter((f) => f.id !== '47') };
function largestPoly(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const p = d3.geoPath();
  let best = null, bestA = -1;
  for (const poly of f.geometry.coordinates) {
    const g = { type: 'Feature', geometry: { type: 'Polygon', coordinates: poly } };
    const a = p.area(g);
    if (a > bestA) { bestA = a; best = g; }
  }
  return best;
}
const mainland = { type: 'FeatureCollection', features: main.features.map(largestPoly) };
const jpProj = d3.geoIdentity().fitExtent([[200, 20], [W - 20, H - 20]], mainland);
const oki = prefFC.features.find((f) => f.id === '47');
// 沖縄は左上の枠に入れる
const OKI_BOX = [[30, 40], [250, 220]];
const okiProj = d3.geoIdentity().fitExtent([[OKI_BOX[0][0] + 15, OKI_BOX[0][1] + 15], [OKI_BOX[1][0] - 15, OKI_BOX[1][1] - 15]], oki);

function largestBounds(proj, f) {
  // 飛び地・離島を除いた一番大きい陸の範囲
  if (f.geometry.type !== 'MultiPolygon') return boundsOf(proj, f).flat();
  const p = d3.geoPath(proj);
  let best = null, bestA = -1;
  for (const poly of f.geometry.coordinates) {
    const g = { type: 'Feature', geometry: { type: 'Polygon', coordinates: poly } };
    const a = p.area(g);
    if (a > bestA) { bestA = a; best = g; }
  }
  return boundsOf(proj, best).flat();
}
function boundsOf(proj, f) {
  const b = d3.geoPath(proj).bounds(f);
  return b.map((p) => p.map(r));
}
const japan = {
  w: W, h: H,
  inset: OKI_BOX.flat(),
  items: PREFS.map(([id, name, yomi, group]) => {
    const f = prefFC.features.find((x) => x.id === id);
    const proj = id === '47' ? okiProj : jpProj;
    return { id, name, yomi, group, d: pathFor(proj, f), b: largestBounds(proj, f) };
  }),
};
// 離島（小笠原など）で本土が小さくならないよう、表示範囲は各県の一番大きい陸＋沖縄の枠で決める
{
  const bs = japan.items.map((it) => it.b).concat([japan.inset]);
  const pad = 12;
  const x0 = Math.min(...bs.map((b) => b[0])) - pad, y0 = Math.min(...bs.map((b) => b[1])) - pad;
  const x1 = Math.max(...bs.map((b) => b[2])) + pad, y1 = Math.max(...bs.map((b) => b[3])) + pad;
  japan.view = [x0, y0, x1 - x0, y1 - y0].map(r);
}

// ---------- 世界 ----------
const KANJI_YOMI = {
  CF: 'ちゅうおうアフリカ', CN: 'ちゅうごく', CD: 'コンゴみんしゅきょうわこく', CG: 'コンゴきょうわこく',
  DM: 'ドミニカこく', DO: 'ドミニカきょうわこく', GQ: 'せきどうギニア', JP: 'にほん',
  KN: 'セントクリストファー・ネイビス', KR: 'かんこく', MH: 'マーシャルしょとう', MK: 'きたマケドニア',
  KP: 'きたちょうせん', SB: 'ソロモンしょとう', SS: 'みなみスーダン', TL: 'ひがしティモール', ZA: 'みなみアフリカ',
  TW: 'たいわん',
};
const NAME_FIX = { TW: '台湾', KN: 'セントクリストファー・ネイビス', US: 'アメリカ', GB: 'イギリス' };
const REGION_JA = { Asia: 'アジア', Europe: 'ヨーロッパ', Africa: 'アフリカ', Americas: 'アメリカ大陸', Oceania: 'オセアニア' };
// かんたんモードの国（よく知られている国）
const EASY = ['JP', 'US', 'CN', 'KR', 'GB', 'FR', 'DE', 'IT', 'ES', 'RU', 'CA', 'BR', 'AU', 'IN', 'MX', 'AR', 'EG',
  'ZA', 'KE', 'TH', 'VN', 'PH', 'ID', 'SG', 'MY', 'NZ', 'TR', 'SA', 'GR', 'SE', 'NO', 'FI', 'CH', 'NL', 'PT',
  'IE', 'PL', 'UA', 'MN', 'PE', 'CL', 'CO', 'NG', 'MA', 'IR', 'NP', 'TW', 'KP', 'DK', 'BE', 'AT', 'JM', 'CU'];

const worldTopo = require('world-atlas/countries-50m.json');
const worldFC = topojson.feature(worldTopo, worldTopo.objects.countries);
const WW = 1000;
const noAnt = { type: 'FeatureCollection', features: worldFC.features.filter((f) => f.id !== '010') };
const wProj = d3.geoNaturalEarth1().rotate([-150, 0]).fitWidth(WW, noAnt); // 太平洋・日本が真ん中
const WH = Math.ceil(d3.geoPath(wProj).bounds(noAnt)[1][1]) + 2;

function mainBounds(f) { return largestBounds(wProj, f); }

const byNum = new Map(countries.map((c) => [c.ccn3, c]));
const world = [];
for (const c of countries) {
  if (!(c.unMember || c.independent || c.cca2 === 'TW')) continue;
  if (c.region === 'Antarctic') continue;
  const f = worldFC.features.find((x) => x.id === c.ccn3);
  const name = NAME_FIX[c.cca2] || c.translations.jpn.common;
  world.push({
    id: c.cca2, name, yomi: KANJI_YOMI[c.cca2] || '', flag: c.flag,
    group: REGION_JA[c.region] || c.region, easy: EASY.includes(c.cca2),
    d: f ? pathFor(wProj, f) : '', b: f ? mainBounds(f) : null,
  });
}
// 国として選べない地域（グリーンランドなど）は背景として描く
const used = new Set(world.map((w) => countries.find((c) => c.cca2 === w.id).ccn3));
const bg = noAnt.features.filter((f) => !used.has(f.id)).map((f) => pathFor(wProj, f)).filter(Boolean).join('');

// タッチで こたえるときの 大陸ごとの 表示範囲（経度・緯度で決めて投影する）
const VIEW_LL = {
  'アジア': [25, -11, 150, 56], 'ヨーロッパ': [-12, 35, 45, 71], 'アフリカ': [-20, -36, 53, 38],
  'アメリカ大陸': [-170, -56, -32, 72], 'オセアニア': [110, -48, 200, 2],
};
const views = {};
for (const [k, [lo0, la0, lo1, la1]] of Object.entries(VIEW_LL)) {
  const xs = [], ys = [];
  for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
    const p = wProj([lo0 + (lo1 - lo0) * i / 20, la0 + (la1 - la0) * j / 20]);
    xs.push(p[0]); ys.push(p[1]);
  }
  views[k] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(r);
}
const out = { japan, world: { w: WW, h: WH, bg, views, items: world } };
const js = 'window.GAME_DATA=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'data.js'), js);
console.log('data.js', (js.length / 1024).toFixed(0) + 'KB', 'countries', world.length, 'with shape', world.filter((w) => w.d).length,
  'missing', world.filter((w) => !w.d).map((w) => w.id).join(','));
