# 演劇抽選プログラム

Node.js で「劇優先方式＋パターン A（ラウンド単位補充）」および欠員補充機能を実装した抽選システムです。  
同一時間帯 ID／同一作品 ID での重複当選を防ぎ、初回抽選と欠員補充後の合計結果を出力します。

## 特徴

- **モジュール化された構造**: 機能別に分割されたクリーンなコード構造
- **クラスベース設計**: Person、Theaterクラスによるデータモデルの明確化
- **堅牢なバリデーション**: 劇ID、定員、設定値の適切なエラーチェック
- **ES6+対応**: モダンなJavaScript機能の活用
- **欠員補充機能**: 初回抽選後の空席を補充する機能

## 前提条件

- Node.js v12 以上
- ファイル文字コード：UTF-8（BOM なし）
- 全ての TSV／TXT はヘッダー行なし

## ディレクトリ構成

```
.
├── index.js                    # メイン処理（エントリーポイント）
├── package.json                # プロジェクト設定
├── README.md                   # 本ファイル
├── utils/                      # ユーティリティモジュール
│   ├── fileUtils.js           # ファイル操作
│   ├── randomUtils.js         # 乱数生成
│   ├── validation.js         # バリデーション
│   └── resultWriter.js        # 結果出力
├── models/                     # データモデル
│   ├── Person.js              # 応募者クラス
│   └── Theater.js             # 劇クラス
├── lottery/                    # 抽選ロジック
│   ├── initialLottery.js      # 初回抽選
│   └── vacancyLottery.js      # 欠員補充
├── input/                      # 入力ファイル配置場所
│   ├── settings.json          # 設定ファイル
│   ├── orders.tsv             # 応募者希望リスト
│   ├── theaters.tsv           # 劇情報一覧
│   └── vacancy_candidates.txt # 欠員補充候補者リスト
└── output/                     # 出力ファイル（実行後に自動生成）
    ├── individual.tsv         # 個人別結果
    └── class.tsv              # 劇別結果
```

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
# npmを使用（推奨）
npm start

# または直接Node.jsで実行
node index.js
```

実行時に以下の処理が行われます：
1. `input/` 以下のファイルを読み込み
2. バリデーション実行（劇ID重複チェック、定員値チェックなど）
3. 初回抽選実行
4. 欠員補充実行（設定有効時のみ）
5. `output/` フォルダの自動作成
6. `output/individual.tsv` と `output/class.tsv` の生成

## 出力ファイルフォーマット

### 1. individual.tsv

```
<個人ID>    <当選劇ID₁>    <当選劇ID₂>    …
```

- 行順：`orders.tsv` の順序を維持
- 各行の劇 ID リストは `theaters.tsv` の順序
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
