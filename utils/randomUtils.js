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
 * @param {any[]} array - シャッフル対象の配列
 * @param {() => number} random - 乱数生成関数
 * @returns {any[]} シャッフル後の配列（元配列は変更しない）
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
 * デフォルトのシード値を生成する
 * @returns {number} 現在のタイムスタンプ
 */
const generateDefaultSeed = () => Date.now();

module.exports = {
  createSeededRandom,
  createShuffledArray,
  generateDefaultSeed,
};