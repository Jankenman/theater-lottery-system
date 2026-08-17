/**
 * 応募者を表すクラス
 */
class Person {
  /**
   * @param {string} id - 個人ID
   * @param {(string|null)[]} prefs - 希望劇IDの配列
   */
  constructor(id, prefs) {
    this.id = id;
    this.prefs = prefs;
    this.assigned = new Set(); // 当選した劇IDの集合
  }

  /**
   * 劇を当選として追加する
   * @param {string} theaterId - 劇ID
   * @param {boolean} isVacancy - 欠員補充かどうか
   */
  addAssignment(theaterId, isVacancy = false) {
    const assignmentId = isVacancy ? `${theaterId}(補)` : theaterId;
    this.assigned.add(assignmentId);
  }

  /**
   * すでに劇に当選しているか
   * @param {string} theaterId - 劇ID
   * @returns {boolean}
   */
  hasAssignment(theaterId) {
    return this.assigned.has(theaterId) || this.assigned.has(`${theaterId}(補)`);
  }

  /**
   * 当選数を取得する
   * @returns {number}
   */
  getAssignmentCount() {
    return this.assigned.size;
  }

  /**
   * 時間帯または作品が重複しているかチェック
   * @param {Object} theater - 劇オブジェクト
   * @param {Map<string, Object>} theaterMap - 劇ID→劇オブジェクトのマップ
   * @returns {boolean}
   */
  hasConflict(theater, theaterMap) {
    for (const assignmentId of this.assigned) {
      const theaterId = assignmentId.replace("(補)", "");
      const assignedTh = theaterMap.get(theaterId);
      if (
        assignedTh.timeSlot === theater.timeSlot ||
        assignedTh.play === theater.play
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * 当選劇IDの配列を取得する（ソート済み）
   * @param {Map<string, number>} [theaterOrderMap] - 劇IDの順序マップ（指定時はtheaters.tsv順、未指定時は昇順）
   * @returns {string[]}
   */
  getSortedAssignments(theaterOrderMap) {
    if (theaterOrderMap) {
      return [...this.assigned].sort((a, b) => {
        const theaterIdA = a.replace("(補)", "");
        const theaterIdB = b.replace("(補)", "");
        const orderA = theaterOrderMap.has(theaterIdA)
          ? theaterOrderMap.get(theaterIdA)
          : Infinity;
        const orderB = theaterOrderMap.has(theaterIdB)
          ? theaterOrderMap.get(theaterIdB)
          : Infinity;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.localeCompare(b);
      });
    }
    return [...this.assigned].sort();
  }
}

module.exports = Person;