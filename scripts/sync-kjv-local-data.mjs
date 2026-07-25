import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = join(ROOT, "public", "bible", "kjv");
const SOURCE_REPO = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master";
const RED_LETTER_SOURCE = "https://kjvstudy.org/api/verse-range";

const BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark",
  "Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter",
  "2 Peter","1 John","2 John","3 John","Jude","Revelation",
];

const GOSPELS = new Set(["Matthew", "Mark", "Luke", "John"]);

function bookFileName(book) {
  return `${book.replace(/\s+/g, "")}.json`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const books = await fetchJson(`${SOURCE_REPO}/Books.json`);
  await writeFile(join(OUTPUT_DIR, "Books.json"), JSON.stringify(books, null, 2), "utf8");

  for (const book of books) {
    const fileName = bookFileName(book);
    const sourceUrl = `${SOURCE_REPO}/${fileName}`;
    const data = await fetchJson(sourceUrl);
    await writeFile(join(OUTPUT_DIR, fileName), JSON.stringify(data), "utf8");
  }

  const redLetter = {};
  for (const book of books.filter((book) => GOSPELS.has(book))) {
    const fileName = bookFileName(book);
    const localBook = await fetchJson(`${SOURCE_REPO}/${fileName}`);
    for (const chapter of localBook.chapters) {
      const chapterNumber = Number(chapter.chapter);
      const verseCount = chapter.verses.length;
      const payload = await fetchJson(`${RED_LETTER_SOURCE}/${encodeURIComponent(book)}/${chapterNumber}/1/${verseCount}`);
      for (const verse of payload.verses || []) {
        if (verse.red_letter) {
          redLetter[`${book} ${chapterNumber}:${verse.verse}`] = verse.red_letter;
        }
      }
    }
  }

  await writeFile(join(OUTPUT_DIR, "red-letter.json"), JSON.stringify(redLetter, null, 2), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
