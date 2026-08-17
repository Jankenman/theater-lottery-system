const path = require("path");
const { readLines } = require("../utils/fileUtils");
const { groupByAssignedCount, pickWinners, assignWinners } = require("./initialLottery");

const INPUT_DIR = "input";
const VACANCY_CANDIDATES_FILE = "vacancy_candidates.txt";

/**
 * 欠員のある劇に対して，充足率優先（動的イコール配分）で指定リストから再抽選
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

  while (true) {
    // 欠員がある（満席でない）劇を抽出
    const vacantTheaters = theaters.filter((t) => !t.isFull());
    if (vacantTheaters.length === 0) break;

    // 充足率の低い順（同率なら残席数が多い順）にソート
    vacantTheaters.sort((a, b) => {
      const rateA = a.capacity > 0 ? a.getAssignmentCount() / a.capacity : 1;
      const rateB = b.capacity > 0 ? b.getAssignmentCount() / b.capacity : 1;
      if (rateA !== rateB) {
        return rateA - rateB;
      }
      return b.getRemainingSeats() - a.getRemainingSeats();
    });

    let assignedInThisPass = false;

    // 充足率が最も低い公演から順に候補者を探索
    for (const theater of vacantTheaters) {
      // 現時点で当選している公演の数ごとにグループ化し，当選数昇順でソート
      const groups = groupByAssignedCount(candidates);
      const counts = [...groups.keys()].sort((a, b) => a - b);

      let assignedToTheater = false;
      for (const count of counts) {
        // 衝突なしの候補者を抽出
        const eligible = groups
          .get(count)
          .filter((person) => !person.hasConflict(theater, theaterMap));

        if (!eligible.length) continue;

        // 衝突なしの候補者から1人選出
        const winners = pickWinners(eligible, 1, random);
        assignWinners(winners, theater, true);
        assignedToTheater = true;
        assignedInThisPass = true;
        break; // この公演に1人割り当てたら、充足率が変動するため内側ループを抜ける
      }

      if (assignedToTheater) {
        break; // 充足率が変動したため、再ソート・再判定のために while ループへ戻る
      }
    }

    // すべての欠員公演に対して割り当て可能な候補者が1人もいなくなったら終了
    if (!assignedInThisPass) {
      break;
    }
  }
};

module.exports = {
  runVacancyLottery,
};