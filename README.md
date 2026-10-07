# そらのクイズ

飛行機の中（オフライン）で遊ぶための、子ども向けクイズ。iPad の「ホーム画面に追加」で使う。

- けいさん（たしざん・ひきざん）／くく
- こっき（国旗 → 国名、国名 → 国旗）
- にほんちず（都道府県）／せかいちず（国）: 光ったところを当てる・地図をタッチして答える
- えいご: 英語の音声を聞いて、合う絵（絵文字）を選ぶ。くだもの・やさい／たべもの／どうぶつ／のりもの・ハワイ／いろ／かず／あいさつ・かいわ

## しくみ

- `index.html` + `app.js` + `data.js`（地図・国データを焼き込み済み）だけで動く。外部への通信なし
- `sw.js` が一式をキャッシュするので、一度ひらけばオフラインでも動く
- 英語の音声: macOS の `say`（Samantha）で作った `audio/en/*.m4a`。作り直しは `cd build && node build-english.js`（単語は `build/english-words.js`）
- 地図データの作り直し: `cd build && npm install && node build-data.js`

## 出典

- 世界地図: [Natural Earth](https://www.naturalearthdata.com/)（パブリックドメイン）/ [world-atlas](https://github.com/topojson/world-atlas)
- 日本地図: [jpn-atlas](https://github.com/biskwikman/jpn-atlas)（国土地理院 地球地図日本）BSD-3-Clause
- 国名・国旗: [mledoze/countries](https://github.com/mledoze/countries)（ODbL）
