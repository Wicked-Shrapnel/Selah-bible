import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import vm from "node:vm";

const [osisPath, hebrewDictionaryPath, greekDictionaryPath] = process.argv.slice(2);

if (!osisPath || !hebrewDictionaryPath || !greekDictionaryPath) {
  throw new Error("Usage: node scripts/build-original-language.mjs <kjv.osis.xml> <strongs-hebrew-dictionary.js> <strongs-greek-dictionary.js>");
}

const outputDirectory = join(process.cwd(), "public", "original-language", "kjv");
const bookNames = {
  Gen: "Genesis", Exod: "Exodus", Lev: "Leviticus", Num: "Numbers", Deut: "Deuteronomy",
  Josh: "Joshua", Judg: "Judges", Ruth: "Ruth", "1Sam": "1Samuel", "2Sam": "2Samuel",
  "1Kgs": "1Kings", "2Kgs": "2Kings", "1Chr": "1Chronicles", "2Chr": "2Chronicles",
  Ezra: "Ezra", Neh: "Nehemiah", Esth: "Esther", Job: "Job", Ps: "Psalms", Prov: "Proverbs",
  Eccl: "Ecclesiastes", Song: "SongofSolomon", Isa: "Isaiah", Jer: "Jeremiah", Lam: "Lamentations",
  Ezek: "Ezekiel", Dan: "Daniel", Hos: "Hosea", Joel: "Joel", Amos: "Amos", Obad: "Obadiah",
  Jonah: "Jonah", Mic: "Micah", Nah: "Nahum", Hab: "Habakkuk", Zeph: "Zephaniah",
  Hag: "Haggai", Zech: "Zechariah", Mal: "Malachi", Matt: "Matthew", Mark: "Mark",
  Luke: "Luke", John: "John", Acts: "Acts", Rom: "Romans", "1Cor": "1Corinthians",
  "2Cor": "2Corinthians", Gal: "Galatians", Eph: "Ephesians", Phil: "Philippians",
  Col: "Colossians", "1Thess": "1Thessalonians", "2Thess": "2Thessalonians",
  "1Tim": "1Timothy", "2Tim": "2Timothy", Titus: "Titus", Phlm: "Philemon",
  Heb: "Hebrews", Jas: "James", "1Pet": "1Peter", "2Pet": "2Peter", "1John": "1John",
  "2John": "2John", "3John": "3John", Jude: "Jude", Rev: "Revelation",
};

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
}

function plainText(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ""));
}

function wordTokens(value) {
  return value.match(/[\p{L}\p{M}\p{N}]+(?:[’'][\p{L}\p{M}\p{N}]+)*/gu) || [];
}

function loadDictionary(source, variableName) {
  const context = { module: { exports: {} } };
  vm.runInNewContext(`${source}\nthis.result = ${variableName};`, context);
  return context.result;
}

function compactDictionary(dictionary, usedIds) {
  return Object.fromEntries([...usedIds].sort().flatMap((id) => {
    const entry = dictionary[id];
    if (!entry) return [];
    return [[id, {
      lemma: entry.lemma || "",
      transliteration: entry.translit || entry.xlit || "",
      pronunciation: entry.pron || "",
      definition: (entry.strongs_def || entry.kjv_def || "").trim(),
      kjv: (entry.kjv_def || "").trim(),
    }]];
  }));
}

const [osis, hebrewSource, greekSource] = await Promise.all([
  readFile(osisPath, "utf8"),
  readFile(hebrewDictionaryPath, "utf8"),
  readFile(greekDictionaryPath, "utf8"),
]);

const bookData = {};
const usedHebrew = new Set();
const usedGreek = new Set();
const versePattern = /<verse\b[^>]*\bsID="([^."]+)\.(\d+)\.(\d+)"[^>]*\/>([\s\S]*?)<verse\b[^>]*\beID="\1\.\2\.\3"[^>]*\/>/g;

for (const match of osis.matchAll(versePattern)) {
  const [, osisBook, chapter, verse, fragment] = match;
  const bookName = bookNames[osisBook];
  if (!bookName) continue;

  const words = [];
  const segmentPattern = /<w\b([^>]*)>([\s\S]*?)<\/w>|((?:(?!<w\b)[\s\S])+?)(?=<w\b|$)/g;
  for (const segment of fragment.matchAll(segmentPattern)) {
    const attributes = segment[1] || "";
    const text = plainText(segment[2] ?? segment[3] ?? "");
    const strongs = [...attributes.matchAll(/strong:([HG]0*\d+)/g)].map((item) => `${item[1][0]}${Number(item[1].slice(1))}`);
    for (const token of wordTokens(text)) {
      words.push(strongs.length ? { text: token, strongs } : { text: token });
      for (const id of strongs) (id.startsWith("H") ? usedHebrew : usedGreek).add(id);
    }
  }

  bookData[bookName] ??= { source: "CrossWire KJV 3.1", verses: {} };
  bookData[bookName].verses[`${chapter}:${verse}`] = words;
}

const hebrewDictionary = loadDictionary(hebrewSource, "strongsHebrewDictionary");
const greekDictionary = loadDictionary(greekSource, "strongsGreekDictionary");

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  ...Object.entries(bookData).map(([book, data]) => writeFile(join(outputDirectory, `${book}.json`), JSON.stringify(data))),
  writeFile(join(outputDirectory, "hebrew.json"), JSON.stringify(compactDictionary(hebrewDictionary, usedHebrew))),
  writeFile(join(outputDirectory, "greek.json"), JSON.stringify(compactDictionary(greekDictionary, usedGreek))),
  writeFile(join(outputDirectory, "README.txt"), [
    "Word-to-Strong's tagging: CrossWire Bible Society KJV 3.1 (public domain).",
    "https://gitlab.com/crosswire-bible-society/kjv",
    "",
    "Strong's Hebrew and Greek dictionary data: Open Scriptures (public domain).",
    "https://github.com/openscriptures/strongs",
    "",
    `Generated by ${basename(import.meta.filename)}.`,
  ].join("\n")),
]);

console.log(`Wrote ${Object.keys(bookData).length} books, ${usedHebrew.size} Hebrew entries, and ${usedGreek.size} Greek entries.`);
