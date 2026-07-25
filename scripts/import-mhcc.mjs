import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2];
const outputRoot = process.argv[3] || path.join(process.cwd(), "public", "commentary", "mhcc");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-mhcc.mjs <mhcc.imp> [output-directory]");
}

const decodeEntities = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", "\"")
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&nbsp;", " ");

const stripMarkup = (value) => decodeEntities(value.replace(/<[^>]+>/g, " "))
  .replace(/\s+/g, " ")
  .trim();

const slug = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const bookAliases = new Map([
  ["I Samuel", "1 Samuel"], ["II Samuel", "2 Samuel"],
  ["I Kings", "1 Kings"], ["II Kings", "2 Kings"],
  ["I Chronicles", "1 Chronicles"], ["II Chronicles", "2 Chronicles"],
  ["I Corinthians", "1 Corinthians"], ["II Corinthians", "2 Corinthians"],
  ["I Thessalonians", "1 Thessalonians"], ["II Thessalonians", "2 Thessalonians"],
  ["I Timothy", "1 Timothy"], ["II Timothy", "2 Timothy"],
  ["I Peter", "1 Peter"], ["II Peter", "2 Peter"],
  ["I John", "1 John"], ["II John", "2 John"], ["III John", "3 John"],
  ["Revelation of John", "Revelation"],
]);

const canonicalBooks = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
  ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
  ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
  ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9],
  ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
  ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4],
  ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28],
  ["Romans", 16], ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6],
  ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6],
  ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5],
  ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1], ["3 John", 1],
  ["Jude", 1], ["Revelation", 22],
];

const imp = await readFile(inputPath, "utf8");
const blocks = imp.split(/^\$\$\$/m).slice(1);
const chapters = new Map();

for (const block of blocks) {
  const lineBreak = block.indexOf("\n");
  if (lineBreak === -1) continue;

  const reference = block.slice(0, lineBreak).trim();
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) continue;

  const [, rawBook, chapterText, anchorText] = match;
  const book = bookAliases.get(rawBook) || rawBook;
  const chapter = Number(chapterText);
  const anchorVerse = Number(anchorText);
  if (chapter < 1 || anchorVerse < 1) continue;

  const raw = block.slice(lineBreak + 1).trim();
  if (!raw) continue;

  const headingMatch = raw.match(/^\s*<b>(.*?)<\/b>/i);
  const heading = headingMatch ? stripMarkup(headingMatch[1]) : `Verse ${anchorVerse}`;
  const rangeMatch = heading.match(/Verses?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
  const verseStart = rangeMatch ? Number(rangeMatch[1]) : anchorVerse;
  const verseEnd = rangeMatch?.[2] ? Number(rangeMatch[2]) : verseStart;
  const references = [...raw.matchAll(/<a[^>]+value=([^&"]+)[^>]*>(.*?)<\/a>/gi)]
    .map((item) => ({ osis: decodeURIComponent(item[1]), label: stripMarkup(item[2]) }));
  const text = stripMarkup(raw.replace(/^\s*<b>.*?<\/b>/i, ""));
  if (!text) continue;

  const key = `${book}|${chapter}`;
  const entries = chapters.get(key) || [];
  entries.push({ anchorVerse, verseStart, verseEnd, heading, text, references });
  chapters.set(key, entries);
}

const source = {
  id: "mhcc",
  title: "Matthew Henry's Concise Commentary on the Whole Bible",
  author: "Matthew Henry",
  edition: "CrossWire SWORD module 2.0 (2021-02-14)",
  license: "Public Domain",
  sourceUrl: "https://crosswire.org/sword/modules/ModInfo.jsp?modName=MHCC",
  contentTypes: ["text", "verse ranges", "scripture references"],
  mediaTypes: [],
};

await mkdir(outputRoot, { recursive: true });
let entryCount = 0;

let chapterCount = 0;
let chaptersWithoutEntries = 0;

for (const [book, numberOfChapters] of canonicalBooks) {
  const directory = path.join(outputRoot, slug(book));
  await mkdir(directory, { recursive: true });
  for (let chapter = 1; chapter <= numberOfChapters; chapter += 1) {
    const entries = chapters.get(`${book}|${chapter}`) || [];
    await writeFile(
      path.join(directory, `${chapter}.json`),
      `${JSON.stringify({ source, book, chapter, entries })}\n`,
      "utf8",
    );
    entryCount += entries.length;
    chapterCount += 1;
    if (!entries.length) chaptersWithoutEntries += 1;
  }
}

await writeFile(
  path.join(outputRoot, "manifest.json"),
  `${JSON.stringify({
    source,
    chapterCount,
    entryCount,
    chaptersWithoutEntries,
    generatedFrom: "CrossWire MHCC public-domain SWORD module",
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Imported ${entryCount} commentary entries across ${chapterCount} chapters (${chaptersWithoutEntries} without an entry).`);
