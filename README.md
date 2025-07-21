# 演劇抽選プログラム README

Node.js で「劇優先方式＋パターン A（ラウンド単位補充）」および欠員補充機能を実装した抽選スクリプトです。  
同一時間帯 ID／同一作品 ID での重複当選を防ぎ、初回抽選と欠員補充後の合計結果を出力します。

## 前提条件

- Node.js v12 以上
- 追加パッケージ不要（Core モジュールのみで動作）
- ファイル文字コード：UTF-8（BOM なし）
- 全ての TSV／TXT はヘッダー行なし

## ディレクトリ構成

```
.
├── index.js
├── README.md
├── input/
│   ├── settings.json
│   ├── orders.tsv
│   ├── theaters.tsv
│   └── vacancy_candidates.txt
└── output/           ← 実行後に自動生成
    ├── individual.tsv
    └── class.tsv
```

- `index.js`：抽選＆欠員補充スクリプト
- `input/`：実行に必要な全入力ファイルを配置
- `output/`：個人別・劇別の結果を出力

## 設定ファイル

**input/settings.json**

```json
{
  "maxOrders": 3,
  "enableVacancy": true
}
```

- `maxOrders`：各人が出せる希望順位の最大数
- `enableVacancy`：欠員補充処理を実行するか（`true`／`false`）

## 入力ファイルフォーマット

### 1. orders.tsv

```
<個人ID>    <第1希望劇ID>    <第2希望劇ID>    …    <第N希望劇ID>
```

- 列数は `maxOrders + 1`
- 空欄は「希望なし（null 扱い）」

### 2. theaters.tsv

```
<劇ID>    <時間帯ID>    <作品ID>    <定員>
```

- 定員は整数

### 3. vacancy_candidates.txt

```
<個人ID1>
<個人ID2>
…
```

- 欠員補充の候補となる個人 ID を改行区切りで列挙

## 実行方法

```bash
node index.js
```

- 実行時に `input/` 以下のファイルを読み込み
- `output/` フォルダが無ければ自動作成
- 終了時に `output/individual.tsv` と `output/class.tsv` を生成

## 出力ファイルフォーマット

### 1. individual.tsv

```
<個人ID>    <当選劇ID₁>    <当選劇ID₂>    …
```

- 行順：`orders.tsv` の順序を維持
- 各行の劇 ID リストは昇順ソート
- 初回抽選＋欠員補充後の合計結果

### 2. class.tsv

```
<劇ID>    <当選者個人ID₁>    <当選者個人ID₂>    …
```

- 行順：`theaters.tsv` の順序を維持
- 各行の個人 ID リストは昇順ソート
- 初回抽選＋欠員補充後の合計結果

## アルゴリズム概要

1. **第 1 ～第 N 希望** を `rank = 0…maxOrders-1` のループで統一処理
2. ラウンド開始前に全劇満員チェック
3. `persons` を「現時点の当選数」でグループ化（当選数少 → 多）
4. 各劇を入力順に一巡し、残席がある劇について：
   - グループ順で希望 `prefs[rank]` 応募者を抽出
   - 既当選・時間帯重複・作品重複を除外
   - 応募者数 ≤ 残席 → 全員当選
   - 応募者数 > 残席 → グループ内シャッフル後に残席分を当選
5. 欠員補充（`enableVacancy = true` の場合）
   - `vacancy_candidates.txt` のリストから一部候補を抽出
   - 各劇の空席数を算出し、当選数少 → 多、同数はランダムで選出
   - 同一時間帯 ID／同一作品 ID 重複を再度チェック
6. 最終的な当選情報を `output/individual.tsv` と `output/class.tsv` に出力

以上の手順で、初回抽選と欠員補充を一貫して実行できます。  
設定やファイル配置に従い、`index.js` を実行してください。
