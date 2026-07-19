const path = require("path");
const { readLines } = require("../utils/fileUtils");
const { groupByAssignedCount, pickWinners, assignWinners } = require("./initialLottery");

const INPUT_DIR = "input";
const VACANCY_CANDIDATES_FILE = "vacancy_candidates.txt";

/**
 * 欠員のある劇に対して，指定リストから再抽選
 * @param {Person[]} persons - 応募者リスト
 * @param {Theater[]} theaters - 劇リスト
 * @param {Map<string, Theater>} theaterMap - 劇ID → 劇オブジェクト
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
    let seats = theater.getRemainingSeats();
    if (seats <= 0) continue;

    // 現時点で当選している公演の数ごとにグループ化し，当選数昇順でソート
    const groups = groupByAssignedCount(candidates);
    const counts = [...groups.keys()].sort((a, b) => a - b);

    // 当選数が少ない人から順に抽選
    for (const count of counts) {
      if (seats <= 0) break;

      // 衝突なしの候補者を抽出
      const eligible = groups
        .get(count)
        .filter((person) => !person.hasConflict(theater, theaterMap));

      if (!eligible.length) continue;

      // 衝突なしの候補者をシャッフル抽選
      const winners = pickWinners(eligible, seats, random);
      assignWinners(winners, theater, true);
      seats -= winners.length;
    }
  }
};

module.exports = {
  runVacancyLottery,
};