const fs = require("fs");
const path = require("path");

/**
 * JSONファイルを安全に読み込む
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
 * ディレクトリが存在しない場合に作成する
 * @param {string} dirPath - ディレクトリパス
 */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
};

/**
 * テキストファイルを書き込む
 * @param {string} filePath - 書き込むファイルのパス
 * @param {string} content - 書き込む内容
 */
const writeTextFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, "utf8");
};

module.exports = {
  safeReadJSON,
  readTSV,
  readLines,
  ensureDirectoryExists,
  writeTextFile,
};