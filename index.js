const fs = require("fs");
const path = require("path");

//
// 定数定義
//
const INPUT_DIR = "input"; // 入力ファイル保管ディレクトリ
const OUTPUT_DIR = "output"; // 出力ファイル保管ディレクトリ
const SETTINGS_FILE = "settings.json"; // 設定ファイル名
const ORDERS_FILE = "orders.tsv"; // 応募者の希望リスト（TSV）
const THEATERS_FILE = "theaters.tsv"; // 劇情報一覧（TSV）
const VACANCY_CANDIDATES_FILE = "vacancy_candidates.txt"; // 欠員補充対象者リスト（テキスト）
const INDIVIDUAL_RESULT_FILE = "individual.tsv"; // 個人別結果出力ファイル名
const CLASS_RESULT_FILE = "class.tsv"; // 劇別結果出力ファイル名

//
// ユーティリティ関数群
//

/**
 * JSONファイルを安全に読み込む
 * - 存在しない／JSONパース失敗時はエラー出力してプロセス終了
 * @param {string} filePath - 読み込むJSONのパス
 * @returns {Object} パースされた設定オブジェクト
 */
const safeReadJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(
      `JSONファイルの読み込み中にエラーが発生しました: ${filePath}`,
      e.message
    );
    process.exit(1);
  }
};

/**
 * TSVファイルを読み込んで2次元配列に変換
 * - 行末改行を除去し，空行は無視
 * @param {string} filePath - 読み込むTSVファイルのパス
 * @returns {string[][]} 各行をカラム毎に分割した2次元配列
 */
const readTSV = (filePath) => {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .trim()
      .split(/\r\n|\n/)
      .filter(Boolean)
      .map((line) => line.split("\t"));
  } catch (e) {
    console.error(
      `TSVファイルの読み込み中にエラーが発生しました: ${filePath}`,
      e.message
    );
    process.exit(1);
  }
};

/**
 * テキストファイルを行単位で読み込む
 * - オプションフラグが立っている場合はファイル未存在を警告して空配列返却
 * @param {string} filePath - 読み込むテキストファイルのパス
 * @param {boolean} [isOptional=false] - ファイルが存在しなかった場合に処理を続行するか
 * @returns {string[]} 各行を要素とした文字列配列
 */
const readLines = (filePath, isOptional = false) => {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .trim()
      .split(/\r\n|\n/)
      .filter(Boolean);
  } catch (e) {
    if (isOptional && e.code === "ENOENT") {
      console.warn(`警告: オプションファイルが見つかりません: ${filePath}`);
      return [];
    }
    console.error(
      `ファイルの読み込み中にエラーが発生しました: ${filePath}`,
      e.message
    );
    process.exit(1);
  }
};

/**
 * シード付き疑似乱数生成器（xorshift）
 * @param {number} seed - シード値
 * @returns {() => number} 0以上1未満の乱数を返す関数
 */
const createSeededRandom = (seed) => {
  let x = 123456789;
  let y = 362436069;
  let z = 521288629;
  let w = seed;

  return () => {
    let t;
    t = x ^ (x << 11);
    x = y;
    y = z;
    z = w;
    w = w ^ (w >> 19) ^ (t ^ (t >> 8));
    return (w >>> 0) / 4294967296;
  };
};

/**
 * Fisher–Yatesアルゴリズムで配列をシャッフル
 * - 元配列は変更せず，新しいコピーを返す
 * @param {any[]} array - シャッフル対象の配列
 * @param {() => number} random - 乱数生成関数
 * @returns {any[]} シャッフル後の配列
 */
const createShuffledArray = (array, random) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

/**
 * 応募者を「現在の当選数」でグループ化
 * - key: 当選数, value: 当選数に該当する応募者配列
 * @param {Array<{assigned: Set<string>}>} persons - 応募者オブジェクト配列
 * @returns {Map<number, Array>} グループ化結果のMap
 */
const groupByAssignedCount = (persons) => {
  const map = new Map();
  for (const p of persons) {
    const count = p.assigned.size;
    if (!map.has(count)) {
      map.set(count, []);
    }
    map.get(count).push(p);
  }
  return map;
};

/**
 * 空席数に応じて当選者を選定
 * - 候補者数 <= 空席数 の場合は全員当選
 * - 超過している場合はシャッフルして seats 人を抽出
 * @param {Array} candidates - 当選候補者配列
 * @param {number} seats - 残り空席数
 * @param {() => number} random - 乱数生成関数
 * @returns {Array} 当選者配列
 */
const pickWinners = (candidates, seats, random) =>
  candidates.length <= seats
    ? candidates
    : createShuffledArray(candidates, random).slice(0, seats);

/**
 * 当選者を劇と応募者両方の assigned に登録
 * @param {Array<{id: string, assigned: Set<string>}>} winners - 当選者オブジェクト配列
 * @param {{id: string, assigned: Set<string>}} theater - 劇オブジェクト
 */
const assignWinners = (winners, theater) => {
  for (const p of winners) {
    theater.assigned.add(p.id);
    p.assigned.add(theater.id);
  }
};

/**
 * 個人がすでに当選している劇と時間帯または作品が重複していないかチェック
 * @param {{assigned: Set<string>}} person - 応募者オブジェクト
 * @param {{timeSlot: string, play: string}} theater - 照合対象の劇オブジェクト
 * @param {Map<string, any>} theaterMap - 劇ID → 劇オブジェクトのMap
 * @returns {boolean} 重複ありなら true
 */
const hasConflict = (person, theater, theaterMap) => {
  for (const tid of person.assigned) {
    const assignedTh = theaterMap.get(tid);
    // 時間帯または作品が一致していたら衝突
    if (
      assignedTh.timeSlot === theater.timeSlot ||
      assignedTh.play === theater.play
    ) {
      return true;
    }
  }
  return false;
};

//
// 初回抽選処理
//

/**
 * 希望順位ラウンド制での初回抽選を実行
 * - 各順位ごとに応募者を公平に当選数順でグループ分け
 * - グループ内で抽選（衝突チェック含む）
 * @param {Array} persons - 応募者リスト
 * @param {Array} theaters - 劇リスト
 * @param {Map<string, any>} theaterMap - 劇ID → 劇オブジェクト
 * @param {number} maxOrders - 最大希望順位数
 * @param {() => number} random - 乱数生成関数
 */
const runInitialLottery = (
  persons,
  theaters,
  theaterMap,
  maxOrders,
  random
) => {
  // 希望順位ごとに抽選を行う。
  // 欠員が生じた場合は次の希望順位で抽選を行い補充していく。
  for (let rank = 0; rank < maxOrders; rank++) {
    // 全劇が満席なら終了
    if (theaters.every((theater) => theater.assigned.size >= theater.capacity))
      break;

    // 現時点で当選している公演の数ごとにグループ化し，当選数昇順でソート
    const groups = groupByAssignedCount(persons);
    const counts = [...groups.keys()].sort((a, b) => a - b);

    // 劇ごとに抽選実施
    for (const theater of theaters) {
      let seats = theater.capacity - theater.assigned.size; // 残席数
      if (seats <= 0) continue; // 満席スキップ

      for (const count of counts) {
        if (seats <= 0) break;

        // 現在の希望順位で劇を希望し，この劇に未当選かつ時間帯や作品に重複のないの応募者を抽出
        const candidates = groups
          .get(count)
          .filter(
            (person) =>
              person.prefs[rank] === theater.id &&
              !person.assigned.has(theater.id) &&
              !hasConflict(person, theater, theaterMap)
          );

        // 条件を満たす候補者がいなければ，次のグループ(すでに当選している劇の数の1つ多い)へ
        if (!candidates.length) continue;

        // 当選者を決定し，登録
        const winners = pickWinners(candidates, seats, random);
        assignWinners(winners, theater);
        seats -= winners.length;
      }
    }
  }
};

//
// 欠員補充処理
//

/**
 * 欠員のある劇に対して，指定リストから再抽選
 * - vacancy_candidates.txt のIDのみ対象
 * - 初回結果と同様のグループ抽選手順
 * @param {Array} persons - 応募者リスト
 * @param {Array} theaters - 劇リスト
 * @param {Map<string, any>} theaterMap - 劇ID → 劇オブジェクト
 * @param {() => number} random - 乱数生成関数
 */
const runVacancyLottery = (persons, theaters, theaterMap, random) => {
  // 補充要員になることを希望している応募者 ID のリスト取得（存在しなくてもOK）
  const vacancyIds = new Set(
    readLines(path.join(INPUT_DIR, VACANCY_CANDIDATES_FILE), true)
  );
  if (vacancyIds.size === 0) return;

  // 該当する応募者のみにフィルタ
  const candidates = persons.filter((person) => vacancyIds.has(person.id));

  for (const theater of theaters) {
    let seats = theater.capacity - theater.assigned.size; // 残席数
    if (seats <= 0) continue; // 満席ならスキップ

    // 現時点で当選している公演の数ごとにグループ化し，当選数昇順でソート
    const groups = groupByAssignedCount(candidates);
    const counts = [...groups.keys()].sort((a, b) => a - b);

    // 当選数が少ない人から順に抽選
    for (const count of counts) {
      if (seats <= 0) break;

      // 衝突なしの候補者を抽出
      const eligible = groups
        .get(count)
        .filter((person) => !hasConflict(person, theater, theaterMap));

      if (!eligible.length) continue; // 衝突なしの候補者がいなければ次へ

      // 衝突なしの候補者をシャッフル抽選
      // 当選者を決定し，登録
      const winners = pickWinners(eligible, seats, random);
      assignWinners(winners, theater);
      seats -= winners.length;
    }
  }
};

//
// 結果出力処理
//

/**
 * 個人別・劇別の当選結果をTSVで出力
 * - 出力ディレクトリがなければ作成
 * @param {Array<{id:string,assigned:Set<string>}>} persons - 応募者結果
 * @param {Array<{id:string,assigned:Set<string>}>} theaters - 劇結果
 */
const writeResults = (persons, theaters) => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  // 個人別: ID タブ 当選劇ID...
  const individualLines = persons
    .map((person) => [person.id, ...[...person.assigned].sort()].join("\t"))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .join("\n");
  fs.writeFileSync(
    path.join(OUTPUT_DIR, INDIVIDUAL_RESULT_FILE),
    individualLines,
    "utf8"
  );

  // 公演別で当選人数をコンソールに出力する

  theaters.forEach((theater) => {
    console.log(theater.id, theater.assigned.size);
  });

  // 劇別: 劇ID タブ 当選応募者ID...
  const classLines = theaters
    .map((theater) => [theater.id, ...[...theater.assigned].sort()].join("\t"))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .join("\n");
  fs.writeFileSync(
    path.join(OUTPUT_DIR, CLASS_RESULT_FILE),
    classLines,
    "utf8"
  );
};

//
// メイン処理
//

/**
 * 劇一覧(theaters.tsv)の読み込みとバリデーション
 * @returns {Array} 劇データ配列
 */
const loadAndValidateTheaters = (filePath) => {
  const theatersData = readTSV(filePath);

  const theaterIds = theatersData.map((cols) => cols[0]); // 劇IDだけの配列を作る

  if (new Set(theaterIds).size !== theaterIds.length) {
    const duplicates = theaterIds.filter(
      (item, index) => theaterIds.indexOf(item) !== index
    );
    console.error(
      `エラー: theaters.tsv に重複した劇IDが含まれています。 (${[
        ...new Set(duplicates),
      ].join(", ")})`
    );
    process.exit(1);
  }

  return theatersData;
};

/**
 * 希望一覧(orders.tsv)の読み込みとバリデーション
 * @param {string} filePath
 * @param {number} maxOrders
 * @param {Set<string>} theaterIdSet
 * @returns {Array} 希望データ配列
 */
const loadAndValidateOrders = (filePath, maxOrders, theaterIdSet) => {
  const orders = readTSV(filePath);
  const personIds = orders.map((cols) => cols[0]);
  if (new Set(personIds).size !== personIds.length) {
    const duplicates = personIds.filter(
      (item, index) => personIds.indexOf(item) !== index
    );
    console.error(
      `エラー: orders.tsv に重複した個人IDが含まれています。 (${[
        ...new Set(duplicates),
      ].join(", ")})`
    );
    process.exit(1);
  }
  for (const order of orders) {
    const personId = order[0];
    for (let i = 1; i <= maxOrders; i++) {
      const theaterId = order[i];
      if (theaterId && theaterId === "" && !theaterIdSet.has(theaterId)) {
        console.error(
          `エラー: 応募者 ${personId} が希望している劇ID '${theaterId}' は theaters.tsv に存在しません。`
        );
        process.exit(1);
      }
    }
  }
  return orders;
};

/**
 * エントリポイント
 * - 設定読込 → 入力ファイル解析 → 抽選処理 → 出力
 */
const main = () => {
  // 設定ファイル読み込み
  const { maxOrders, enableVacancy, seed } = safeReadJSON(
    path.join(INPUT_DIR, SETTINGS_FILE)
  );

  const defaultSeed = Date.now();

  // 乱数生成器の初期化
  const random = createSeededRandom(
    seed ||
      (console.log(
        `シード値が指定されていなかったため，シード値を生成しました: ${defaultSeed}`
      ),
      defaultSeed)
  );

  // 劇一覧読み込み・バリデーション
  const theatersData = loadAndValidateTheaters(
    path.join(INPUT_DIR, THEATERS_FILE)
  );
  const theaterIds = theatersData.map((cols) => cols[0]);
  const theaterIdSet = new Set(theaterIds);

  // 希望一覧読み込み・バリデーション
  const orders = loadAndValidateOrders(
    path.join(INPUT_DIR, ORDERS_FILE),
    maxOrders,
    theaterIdSet
  );

  // 応募者オブジェクト生成
  const persons = orders.map((cols) => ({
    id: cols[0],
    prefs: Array.from({ length: maxOrders }, (_, i) => cols[i + 1] || null),
    assigned: new Set(), // 当選劇IDを保持するSet
  }));

  // 劇オブジェクト生成
  const theaters = theatersData.map((cols) => ({
    id: cols[0],
    timeSlot: cols[1],
    play: cols[2],
    capacity: parseInt(cols[3], 10),
    assigned: new Set(), // 当選応募者IDを保持するSet
  }));

  // 劇ID→劇オブジェクトMap
  const theaterMap = new Map(theaters.map((theater) => [theater.id, theater]));

  // 初回抽選実行
  runInitialLottery(persons, theaters, theaterMap, maxOrders, random);

  // 欠員補充抽選（設定有効時のみ）
  if (enableVacancy) runVacancyLottery(persons, theaters, theaterMap, random);

  // 結果出力
  writeResults(persons, theaters);

  console.log(
    `抽選完了：./${OUTPUT_DIR} に ${INDIVIDUAL_RESULT_FILE} / ${CLASS_RESULT_FILE} を出力しました。`
  );
};

main();
