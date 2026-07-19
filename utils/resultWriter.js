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

  // 個人別: ID タブ 当選劇ID...
  const individualLines = persons
    .map((person) => [person.id, ...person.getSortedAssignments()].join("\t"))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .join("\n");
  writeTextFile(
    path.join(OUTPUT_DIR, INDIVIDUAL_RESULT_FILE),
    individualLines
  );

  // 公演別で当選人数をコンソールに出力する
  theaters.forEach((theater) => {
    console.log(theater.id, theater.getAssignmentCount());
  });

  // 劇別: 劇ID タブ 当選応募者ID...
  const classLines = theaters
    .map((theater) => [theater.id, ...theater.getSortedAssignments()].join("\t"))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .join("\n");
  writeTextFile(
    path.join(OUTPUT_DIR, CLASS_RESULT_FILE),
    classLines
  );
};

module.exports = {
  writeResults,
};