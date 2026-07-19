/**
 * 配列内の重複要素を検出する
 * @param {Array} array - 検査対象の配列
 * @returns {Array} 重複している要素の配列
 */
const findDuplicates = (array) => {
  const duplicates = array.filter(
    (item, index) => array.indexOf(item) !== index
  );
  return [...new Set(duplicates)];
};

/**
 * 劇一覧のバリデーション
 * @param {string[][]} theatersData - 劇データ配列
 * @returns {string[]} 劇IDの配列
 */
const validateTheatersData = (theatersData) => {
  const theaterIds = theatersData.map((cols) => cols[0]);

  if (new Set(theaterIds).size !== theaterIds.length) {
    const duplicates = findDuplicates(theaterIds);
    console.error(
      `エラー: theaters.tsv に重複した劇IDが含まれています。 (${duplicates.join(", ")})`
    );
    process.exit(1);
  }

  return theaterIds;
};

/**
 * 希望一覧のバリデーション
 * @param {string[][]} orders - 希望データ配列
 * @param {number} maxOrders - 最大希望順位数
 * @param {Set<string>} theaterIdSet - 劇IDのセット
 */
const validateOrdersData = (orders, maxOrders, theaterIdSet) => {
  const personIds = orders.map((cols) => cols[0]);
  
  if (new Set(personIds).size !== personIds.length) {
    const duplicates = findDuplicates(personIds);
    console.error(
      `エラー: orders.tsv に重複した個人IDが含まれています。 (${duplicates.join(", ")})`
    );
    process.exit(1);
  }

  for (const order of orders) {
    const personId = order[0];
    for (let i = 1; i <= maxOrders; i++) {
      const theaterId = order[i];
      if (theaterId && theaterId !== "" && !theaterIdSet.has(theaterId)) {
        console.error(
          `エラー: 応募者 ${personId} が希望している劇ID '${theaterId}' は theaters.tsv に存在しません。`
        );
        process.exit(1);
      }
    }
  }
};

/**
 * 設定値のバリデーション
 * @param {Object} settings - 設定オブジェクト
 * @returns {Object} バリデーション済みの設定オブジェクト
 */
const validateSettings = (settings) => {
  if (typeof settings.maxOrders !== 'number' || settings.maxOrders < 1) {
    console.error(
      `エラー: maxOrders は1以上の整数である必要があります: ${settings.maxOrders}`
    );
    process.exit(1);
  }

  if (typeof settings.enableVacancy !== 'boolean') {
    console.error(
      `エラー: enableVacancy は真偽値である必要があります: ${settings.enableVacancy}`
    );
    process.exit(1);
  }

  return settings;
};

/**
 * 定員値のバリデーション
 * @param {string} capacityStr - 定員の文字列表現
 * @param {string} theaterId - 劇ID（エラーメッセージ用）
 * @returns {number} パースされた定員値
 */
const validateCapacity = (capacityStr, theaterId) => {
  const capacity = parseInt(capacityStr, 10);
  if (isNaN(capacity) || capacity < 0) {
    console.error(
      `エラー: 劇 ${theaterId} の定員が無効な値です: ${capacityStr}`
    );
    process.exit(1);
  }
  return capacity;
};

module.exports = {
  findDuplicates,
  validateTheatersData,
  validateOrdersData,
  validateSettings,
  validateCapacity,
};