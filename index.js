const path = require("path");

// ユーティリティ
const { safeReadJSON, readTSV } = require("./utils/fileUtils");
const { createSeededRandom, generateDefaultSeed } = require("./utils/randomUtils");
const { validateTheatersData, validateOrdersData, validateSettings, validateCapacity } = require("./utils/validation");
const { writeResults } = require("./utils/resultWriter");

// モデル
const Person = require("./models/Person");
const Theater = require("./models/Theater");

// 抽選ロジック
const { runInitialLottery } = require("./lottery/initialLottery");
const { runVacancyLottery } = require("./lottery/vacancyLottery");

// 定数
const INPUT_DIR = "input";
const SETTINGS_FILE = "settings.json";
const ORDERS_FILE = "orders.tsv";
const THEATERS_FILE = "theaters.tsv";
const OUTPUT_DIR = "output";
const INDIVIDUAL_RESULT_FILE = "individual.tsv";
const CLASS_RESULT_FILE = "class.tsv";

/**
 * 劇一覧(theaters.tsv)の読み込みとバリデーション
 * @returns {Theater[]} 劇データ配列
 */
const loadAndValidateTheaters = () => {
  const theatersData = readTSV(path.join(INPUT_DIR, THEATERS_FILE));
  const theaterIds = validateTheatersData(theatersData);

  return theatersData.map((cols) => {
    const capacity = validateCapacity(cols[3], cols[0]);
    return new Theater(cols[0], cols[1], cols[2], capacity);
  });
};

/**
 * 希望一覧(orders.tsv)の読み込みとバリデーション
 * @param {number} maxOrders - 最大希望順位数
 * @param {Set<string>} theaterIdSet - 劇IDのセット
 * @returns {Person[]} 応募者データ配列
 */
const loadAndValidateOrders = (maxOrders, theaterIdSet) => {
  const orders = readTSV(path.join(INPUT_DIR, ORDERS_FILE));
  validateOrdersData(orders, maxOrders, theaterIdSet);

  return orders.map((cols) => {
    const prefs = Array.from({ length: maxOrders }, (_, i) => cols[i + 1] || null);
    return new Person(cols[0], prefs);
  });
};

/**
 * エントリポイント
 * - 設定読込 → 入力ファイル解析 → 抽選処理 → 出力
 */
const main = () => {
  // 設定ファイル読み込みとバリデーション
  const settings = validateSettings(
    safeReadJSON(path.join(INPUT_DIR, SETTINGS_FILE))
  );

  const { maxOrders, enableVacancy, seed } = settings;

  // 乱数生成器の初期化
  const defaultSeed = generateDefaultSeed();
  const random = createSeededRandom(
    seed ||
      (console.log(
        `シード値が指定されていなかったため，シード値を生成しました: ${defaultSeed}`
      ),
      defaultSeed)
  );

  // 劇一覧読み込み・バリデーション
  const theaters = loadAndValidateTheaters();
  const theaterMap = new Map(theaters.map((theater) => [theater.id, theater]));
  const theaterIdSet = new Set(theaters.map((theater) => theater.id));

  // 希望一覧読み込み・バリデーション
  const persons = loadAndValidateOrders(maxOrders, theaterIdSet);

  // 初回抽選実行
  runInitialLottery(persons, theaters, theaterMap, maxOrders, random);

  // 欠員補充抽選（設定有効時のみ）
  if (enableVacancy) {
    runVacancyLottery(persons, theaters, theaterMap, random);
  }

  // 結果出力
  writeResults(persons, theaters);

  console.log(
    `抽選完了：./${OUTPUT_DIR} に ${INDIVIDUAL_RESULT_FILE} / ${CLASS_RESULT_FILE} を出力しました。`
  );
};

main();