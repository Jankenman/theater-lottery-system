/**
 * 劇を表すクラス
 */
class Theater {
  /**
   * @param {string} id - 劇ID
   * @param {string} timeSlot - 時間帯ID
   * @param {string} play - 作品ID
   * @param {number} capacity - 定員
   */
  constructor(id, timeSlot, play, capacity) {
    this.id = id;
    this.timeSlot = timeSlot;
    this.play = play;
    this.capacity = capacity;
    this.assigned = new Set(); // 当選した個人IDの集合
  }

  /**
   * 個人を当選として追加する
   * @param {string} personId - 個人ID
   */
  addAssignment(personId) {
    this.assigned.add(personId);
  }

  /**
   * 残席数を取得する
   * @returns {number}
   */
  getRemainingSeats() {
    return this.capacity - this.assigned.size;
  }

  /**
   * 満席かどうか
   * @returns {boolean}
   */
  isFull() {
    return this.assigned.size >= this.capacity;
  }

  /**
   * 当選者数を取得する
   * @returns {number}
   */
  getAssignmentCount() {
    return this.assigned.size;
  }

  /**
   * 当選者IDの配列を取得する（ソート済み）
   * @returns {string[]}
   */
  getSortedAssignments() {
    return [...this.assigned].sort();
  }
}

module.exports = Theater;