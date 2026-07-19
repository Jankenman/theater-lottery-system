const { createShuffledArray } = require("../utils/randomUtils");

/**
 * 応募者を「現在の当選数」でグループ化
 * @param {Person[]} persons - 応募者オブジェクト配列
 * @returns {Map<number, Person[]>} グループ化結果のMap
 */
const groupByAssignedCount = (persons) => {
  const map = new Map();
  for (const person of persons) {
    const count = person.getAssignmentCount();
    if (!map.has(count)) {
      map.set(count, []);
    }
    map.get(count).push(person);
  }
  return map;
};

/**
 * 空席数に応じて当選者を選定
 * @param {Person[]} candidates - 当選候補者配列
 * @param {number} seats - 残り空席数
 * @param {() => number} random - 乱数生成関数
 * @returns {Person[]} 当選者配列
 */
const pickWinners = (candidates, seats, random) => {
  if (candidates.length <= seats) {
    return candidates;
  }
  return createShuffledArray(candidates, random).slice(0, seats);
};

/**
 * 当選者を劇と応募者両方に登録
 * @param {Person[]} winners - 当選者オブジェクト配列
 * @param {Theater} theater - 劇オブジェクト
 * @param {boolean} isVacancy - 欠員補充かどうか
 */
const assignWinners = (winners, theater, isVacancy = false) => {
  for (const person of winners) {
    theater.addAssignment(person.id);
    person.addAssignment(theater.id, isVacancy);
  }
};

/**
 * 希望順位ラウンド制での初回抽選を実行
 * @param {Person[]} persons - 応募者リスト
 * @param {Theater[]} theaters - 劇リスト
 * @param {Map<string, Theater>} theaterMap - 劇ID → 劇オブジェクト
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
  for (let rank = 0; rank < maxOrders; rank++) {
    // 全劇が満席なら終了
    if (theaters.every((theater) => theater.isFull())) {
      break;
    }

    // 現時点で当選している公演の数ごとにグループ化し，当選数昇順でソート
    const groups = groupByAssignedCount(persons);
    const counts = [...groups.keys()].sort((a, b) => a - b);

    // 劇ごとに抽選実施
    for (const theater of theaters) {
      let seats = theater.getRemainingSeats();
      if (seats <= 0) continue;

      for (const count of counts) {
        if (seats <= 0) break;

        // 現在の希望順位で劇を希望し，この劇に未当選かつ時間帯や作品に重複のない応募者を抽出
        const candidates = groups
          .get(count)
          .filter(
            (person) =>
              person.prefs[rank] === theater.id &&
              !person.hasAssignment(theater.id) &&
              !person.hasConflict(theater, theaterMap)
          );

        if (!candidates.length) continue;

        // 当選者を決定し，登録
        const winners = pickWinners(candidates, seats, random);
        assignWinners(winners, theater, false);
        seats -= winners.length;
      }

      // この希望順位の抽選が終了した時点での残席数を出力
      console.log(`第${rank + 1}希望 ${theater.id} (抽選後の残席: ${seats})`);
    }
  }
};

module.exports = {
  runInitialLottery,
  groupByAssignedCount,
  pickWinners,
  assignWinners,
};