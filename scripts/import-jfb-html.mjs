import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputRoot = process.argv[2];
const outputRoot = process.argv[3] || path.join(process.cwd(), "public", "commentary", "jfb");

if (!inputRoot) {
  throw new Error("Usage: node scripts/import-jfb-html.mjs <jfb-html-directory> [output-directory]");
}

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

const source = {
  id: "jfb",
  title: "Commentary Critical and Explanatory on the Whole Bible",
  author: "Robert Jamieson, A. R. Fausset and David Brown",
  edition: "CCEL expanded electronic edition of the 1871 public-domain text",
  license: "Public Domain",
  sourceUrl: "https://ccel.org/j/jfb/jfb/JFB00.htm",
  contentTypes: ["text", "verse ranges", "scripture references"],
  mediaTypes: [],
};

const bookCodes = new Map([
  ["Genesis", "Ge"], ["Exodus", "Ex"], ["Leviticus", "Le"], ["Numbers", "Nu"], ["Deuteronomy", "De"],
  ["Joshua", "Jos"], ["Judges", "Jud"], ["Ruth", "Ru"], ["1 Samuel", "1Sa"], ["2 Samuel", "2Sa"],
  ["1 Kings", "1Ki"], ["2 Kings", "2Ki"], ["1 Chronicles", "1Ch"], ["2 Chronicles", "2Ch"], ["Ezra", "Ezr"],
  ["Nehemiah", "Ne"], ["Esther", "Es"], ["Job", "Job"], ["Psalms", "Ps"], ["Proverbs", "Pr"],
  ["Ecclesiastes", "Ec"], ["Song of Solomon", "So"], ["Isaiah", "Isa"], ["Jeremiah", "Jer"], ["Lamentations", "La"],
  ["Ezekiel", "Eze"], ["Daniel", "Da"], ["Hosea", "Ho"], ["Joel", "Joe"], ["Amos", "Am"],
  ["Obadiah", "Ob"], ["Jonah", "Jon"], ["Micah", "Mic"], ["Nahum", "Na"], ["Habakkuk", "Hab"],
  ["Zephaniah", "Zep"], ["Haggai", "Hag"], ["Zechariah", "Zec"], ["Malachi", "Mal"],
  ["Matthew", "Mt"], ["Mark", "Mr"], ["Luke", "Lu"], ["John", "Joh"], ["Acts", "Ac"],
  ["Romans", "Ro"], ["1 Corinthians", "1Co"], ["2 Corinthians", "2Co"], ["Galatians", "Ga"], ["Ephesians", "Eph"],
  ["Philippians", "Php"], ["Colossians", "Col"], ["1 Thessalonians", "1Th"], ["2 Thessalonians", "2Th"], ["1 Timothy", "1Ti"],
  ["2 Timothy", "2Ti"], ["Titus", "Tit"], ["Philemon", "Phm"], ["Hebrews", "Heb"], ["James", "Jas"],
  ["1 Peter", "1Pe"], ["2 Peter", "2Pe"], ["1 John", "1Jo"], ["2 John", "2Jo"], ["3 John", "3Jo"],
  ["Jude", "Jude"], ["Revelation", "Re"],
]);

const slug = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", "\"")
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&nbsp;", " ");

const stripSmallCaps = (html) => html.replace(/<FONT\s+SIZE=-1>(.*?)<\/FONT>/gis, (_, text) => text.toLowerCase());
const stripMarkup = (html) => decodeEntities(stripSmallCaps(html)
  .replace(/<BR\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " "))
  .replace(/\s+/g, " ")
  .trim();

function extractReferences(html) {
  return [...html.matchAll(/<A\s+HREF="[^"]*passage=([^"]+)"[^>]*>(.*?)<\/A>/gis)]
    .map((match) => ({
      osis: decodeURIComponent(match[1]).replace(/\+/g, " "),
      label: stripMarkup(match[2]),
    }))
    .filter((reference) => reference.label);
}

function parseVerseRange(book, chapter, anchorName, headingText) {
  const code = bookCodes.get(book);
  const anchor = code ? anchorName.match(new RegExp(`^${code}${chapter}_(\\d+)(?:_(\\d+))?$`, "i")) : null;
  const heading = headingText.match(/^(\d+)(?:-(\d+))?\./);
  const verseStart = Number(heading?.[1] || anchor?.[1] || 1);
  const verseEnd = Number(heading?.[2] || anchor?.[2] || verseStart);
  return { verseStart, verseEnd };
}

function parseChapterEntries(book, chapter, html) {
  const code = bookCodes.get(book);
  if (!code) return [];
  const anchorPattern = new RegExp(`<A\\s+NAME="${code}${chapter}_(\\d+(?:_\\d+)?)">\\s*</A>`, "gi");
  const anchors = [...html.matchAll(anchorPattern)].map((match) => ({ name: `${code}${chapter}_${match[1]}`, index: match.index || 0 }));
  return anchors.map((anchor, index) => {
    const block = html.slice(anchor.index, anchors[index + 1]?.index ?? html.length);
    const paragraphMatch = block.match(/<P[^>]*>([\s\S]*?)<\/P>/i);
    const paragraph = paragraphMatch?.[1] || block;
    const headingText = stripMarkup(paragraph.match(/<B>(.*?)<\/B>/is)?.[1] || "");
    const { verseStart, verseEnd } = parseVerseRange(book, chapter, anchor.name, headingText);
    const text = stripMarkup(paragraph);
    return {
      anchorVerse: verseStart,
      verseStart,
      verseEnd,
      heading: headingText || (verseStart === verseEnd ? `Verse ${verseStart}` : `Verses ${verseStart}-${verseEnd}`),
      text,
      references: extractReferences(paragraph),
    };
  }).filter((entry) => entry.text);
}

await mkdir(outputRoot, { recursive: true });

let entryCount = 0;
let chapterCount = 0;
let chaptersWithoutEntries = 0;

for (const [book, numberOfChapters] of canonicalBooks) {
  const bookIndex = canonicalBooks.findIndex(([name]) => name === book) + 1;
  const html = await readFile(path.join(inputRoot, `JFB${String(bookIndex).padStart(2, "0")}.htm`), "utf8");
  const directory = path.join(outputRoot, slug(book));
  await mkdir(directory, { recursive: true });
  for (let chapter = 1; chapter <= numberOfChapters; chapter += 1) {
    const chapterStart = html.search(new RegExp(`<A\\s+NAME="Chapter${chapter}">`, "i"));
    const chapterEnd = chapter === numberOfChapters
      ? html.length
      : html.search(new RegExp(`<A\\s+NAME="Chapter${chapter + 1}">`, "i"));
    const chapterHtml = chapterStart >= 0 ? html.slice(chapterStart, chapterEnd >= 0 ? chapterEnd : html.length) : "";
    const entries = parseChapterEntries(book, chapter, chapterHtml);
    await writeFile(path.join(directory, `${chapter}.json`), `${JSON.stringify({ source, book, chapter, entries })}\n`, "utf8");
    chapterCount += 1;
    entryCount += entries.length;
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
    generatedFrom: "CCEL JFB public-domain HTML edition",
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Imported ${entryCount} JFB entries across ${chapterCount} chapters (${chaptersWithoutEntries} without an entry).`);
