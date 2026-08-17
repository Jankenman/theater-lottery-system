const path = require("path");
const { ensureDirectoryExists, writeTextFile } = require("./fileUtils");

const OUTPUT_DIR = "output";
const INDIVIDUAL_RESULT_FILE = "individual.tsv";
const CLASS_RESULT_FILE = "class.tsv";

/**
 * 個人別・劇別の当選結果をTSVで出力
 * @param {Person[]} persons - 応募者結果
 * @param {Theater[]} theaters - 劇結果
 */
const writeResults = (persons, theaters) => {
  ensureDirectoryExists(OUTPUT_DIR);

  // theaters.tsv の順序マップ（劇ID -> インデックス）
  const theaterOrderMap = new Map(
    theaters.map((theater, index) => [theater.id, index])
  );

  // 個人別: ID タブ 当選劇ID... (input/theaters.tsv の順序で出力)
  const individualLines = persons
    .map((person) =>
      [person.id, ...person.getSortedAssignments(theaterOrderMap)].join("\t")
    )
    .join("\n");
  writeTextFile(
    path.join(OUTPUT_DIR, INDIVIDUAL_RESULT_FILE),
    individualLines
  );

  // 公演別で当選人数をコンソールに出力する
  theaters.forEach((theater) => {
    console.log(theater.id, theater.getAssignmentCount());
  });

  // 劇別: 劇ID タブ 当選応募者ID... (theaters.tsv の順序を維持)
  const classLines = theaters
    .map((theater) => [theater.id, ...theater.getSortedAssignments()].join("\t"))
    .join("\n");
  writeTextFile(
    path.join(OUTPUT_DIR, CLASS_RESULT_FILE),
    classLines
  );
};

module.exports = {
  writeResults,
};