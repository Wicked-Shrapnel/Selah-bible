"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

type Verse = { id: number; reference: string; text: string };
type Book = { name: string; chapters: number; testament: "Old Testament" | "New Testament" };
type Picker = "books" | "chapters" | null;
type StudyTab = "commentary" | "lexicon" | "notes";
type CommentaryView = "expository" | "jfb" | "clarke";
type HighlightColor = "gold" | "sage" | "blue" | "rose";
type ThemePreference = "system" | "light" | "dark" | "green-dark" | "true-dark";
type AudioSourcePreference = "auto" | "official" | "david";
type LexiconEntry = { word: string; transliteration: string; pronunciation: string; spoken: string; number: string; meaning: string; lang: "he-IL" | "el-GR" };
type OriginalWordToken = { text: string; strongs?: string[] };
type OriginalLanguageBook = { source: string; verses: Record<string, OriginalWordToken[]> };
type StrongDictionaryEntry = { lemma: string; transliteration: string; pronunciation: string; definition: string; kjv: string };
type StrongDictionary = Record<string, StrongDictionaryEntry>;
type SavedAudioManifest = { chapters: string[]; chapterFiles?: Record<string, string>; format?: string; source?: string };
type CommentaryReference = { osis: string; label: string };
type CommentaryEntry = { anchorVerse: number; verseStart: number; verseEnd: number; heading: string; text: string; references: CommentaryReference[] };
type CommentaryReferenceLink = CommentaryReference & { href: string; start: number; end: number };
type CommentaryReferenceTab = {
  reference: CommentaryReference;
  passage: { book: Book; chapter: number; verse: number };
  previous: { book: Book; chapter: number; verse: number };
};
type CommentaryResourceInfo = {
  view: CommentaryView;
  title: string;
  author: string;
  source: string;
  where: string;
  bestFor: string;
  summary: string;
  tag: string;
  linkLabel: string;
  linkUrl: (bookName: string, chapterNumber: number) => string;
};
type CommentarySource = {
  id: string;
  title: string;
  author: string;
  edition: string;
  license: string;
  sourceUrl: string;
  contentTypes: string[];
  mediaTypes: string[];
};
type CommentaryChapter = { source: CommentarySource; book: string; chapter: number; entries: CommentaryEntry[] };
type SavedPlace = { book: string; chapter: number };
type ReadingHistoryEntry = SavedPlace & { visitedAt: string };
type SavedReference = { key: string; book: Book; chapter: number; verseIds: number[]; reference: string };
type SavedTextCache = Record<string, Record<number, string>>;
type BibleSourceVerse = { verse: string; text: string };
type BibleSourceChapter = { chapter: string; verses: BibleSourceVerse[] };
type BibleSourceBook = { book: string; chapters: BibleSourceChapter[] };
type BibleSearchResult = { book: Book; chapter: number; verse: number; reference: string; text: string; rank: number; kind: "match" | "suggestion" };
type UpdateStatus = "idle" | "checking" | "current" | "available" | "updating" | "error";
type ReleaseNote = { version: string; title?: string; releasedAt?: string; changes?: string[] };
type PendingReleaseNotes = { fromVersion: string; toVersion: string; releases: ReleaseNote[] };
type AppVersionManifest = { latestVersion?: string; version?: string; releaseUrl?: string; releasedAt?: string; releases?: ReleaseNote[]; changelog?: ReleaseNote[]; notes?: string[] };
type HighlightMeaningMap = Record<HighlightColor, string>;

const APP_VERSION = "2.0.15";
const APP_VERSION_MANIFEST_URL = "https://raw.githubusercontent.com/Wicked-Shrapnel/Selah-bible/main/public/app-version.json";
const STUDY_PANEL_WIDTH_STORAGE_KEY = "selah-study-panel-width-v1";
const UPDATE_NOTES_STORAGE_KEY = "selah-pending-release-notes-v1";
const LAST_SEEN_VERSION_STORAGE_KEY = "selah-last-seen-version-v1";
const READING_HISTORY_STORAGE_KEY = "selah-reading-history-v1";
const READING_HISTORY_LIMIT = 50;
const READ_ALOUD_RATE_OPTIONS = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3];
const DEFAULT_READ_ALOUD_RATE = 0.9;
const MIN_STUDY_PANEL_WIDTH = 380;
const MAX_STUDY_PANEL_WIDTH = 680;
const OFFICIAL_AUDIO_ENABLED = false;
const highlightSwatchColors: Record<HighlightColor, string> = {
  gold: "#e3c15d",
  sage: "#8eb49a",
  blue: "#8eb9d3",
  rose: "#d99a95",
};
const highlightColorNames: Record<HighlightColor, string> = {
  gold: "Gold",
  sage: "Sage",
  blue: "Blue",
  rose: "Rose",
};

function highlightMeaningLabel(color: HighlightColor, meanings: HighlightMeaningMap) {
  const meaning = meanings[color]?.trim();
  return meaning ? `${highlightColorNames[color]} — ${meaning}` : highlightColorNames[color];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function releaseNotesForUpdate(manifest: AppVersionManifest, fromVersion: string, toVersion: string): ReleaseNote[] {
  const releases = [...(manifest.releases || manifest.changelog || [])]
    .filter((release) => release.version && compareVersions(release.version, fromVersion) > 0 && compareVersions(release.version, toVersion) <= 0)
    .map((release) => ({
      ...release,
      changes: release.changes?.length ? release.changes : ["Selah has been updated to this version."],
    }))
    .sort((left, right) => compareVersions(left.version, right.version));

  if (releases.length) return releases;

  return [{
    version: toVersion,
    title: "Selah update",
    releasedAt: manifest.releasedAt,
    changes: manifest.notes?.length ? manifest.notes : ["Selah has been updated to the latest available version."],
  }];
}

function allReleaseNotes(manifest: AppVersionManifest): ReleaseNote[] {
  return [...(manifest.releases || manifest.changelog || [])]
    .filter((release) => release.version)
    .map((release) => ({
      ...release,
      changes: release.changes?.length ? release.changes : ["Selah has been updated to this version."],
    }))
    .sort((left, right) => compareVersions(right.version, left.version));
}

function closestReadAloudRate(value: number) {
  return READ_ALOUD_RATE_OPTIONS.reduce((closest, option) => (
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest
  ), DEFAULT_READ_ALOUD_RATE);
}

const books: Book[] = [
  ["Genesis",50,"Old Testament"],["Exodus",40,"Old Testament"],["Leviticus",27,"Old Testament"],["Numbers",36,"Old Testament"],["Deuteronomy",34,"Old Testament"],
  ["Joshua",24,"Old Testament"],["Judges",21,"Old Testament"],["Ruth",4,"Old Testament"],["1 Samuel",31,"Old Testament"],["2 Samuel",24,"Old Testament"],
  ["1 Kings",22,"Old Testament"],["2 Kings",25,"Old Testament"],["1 Chronicles",29,"Old Testament"],["2 Chronicles",36,"Old Testament"],["Ezra",10,"Old Testament"],
  ["Nehemiah",13,"Old Testament"],["Esther",10,"Old Testament"],["Job",42,"Old Testament"],["Psalms",150,"Old Testament"],["Proverbs",31,"Old Testament"],
  ["Ecclesiastes",12,"Old Testament"],["Song of Solomon",8,"Old Testament"],["Isaiah",66,"Old Testament"],["Jeremiah",52,"Old Testament"],["Lamentations",5,"Old Testament"],
  ["Ezekiel",48,"Old Testament"],["Daniel",12,"Old Testament"],["Hosea",14,"Old Testament"],["Joel",3,"Old Testament"],["Amos",9,"Old Testament"],
  ["Obadiah",1,"Old Testament"],["Jonah",4,"Old Testament"],["Micah",7,"Old Testament"],["Nahum",3,"Old Testament"],["Habakkuk",3,"Old Testament"],
  ["Zephaniah",3,"Old Testament"],["Haggai",2,"Old Testament"],["Zechariah",14,"Old Testament"],["Malachi",4,"Old Testament"],
  ["Matthew",28,"New Testament"],["Mark",16,"New Testament"],["Luke",24,"New Testament"],["John",21,"New Testament"],["Acts",28,"New Testament"],
  ["Romans",16,"New Testament"],["1 Corinthians",16,"New Testament"],["2 Corinthians",13,"New Testament"],["Galatians",6,"New Testament"],["Ephesians",6,"New Testament"],
  ["Philippians",4,"New Testament"],["Colossians",4,"New Testament"],["1 Thessalonians",5,"New Testament"],["2 Thessalonians",3,"New Testament"],["1 Timothy",6,"New Testament"],
  ["2 Timothy",4,"New Testament"],["Titus",3,"New Testament"],["Philemon",1,"New Testament"],["Hebrews",13,"New Testament"],["James",5,"New Testament"],
  ["1 Peter",5,"New Testament"],["2 Peter",3,"New Testament"],["1 John",5,"New Testament"],["2 John",1,"New Testament"],["3 John",1,"New Testament"],
  ["Jude",1,"New Testament"],["Revelation",22,"New Testament"],
].map(([name, chapters, testament]) => ({ name, chapters, testament } as Book));

function normalizeSavedPlace(value: unknown): { place: SavedPlace; book: Book } | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as { book?: unknown; chapter?: unknown };
  const bookName = typeof saved.book === "string" ? saved.book : null;
  const chapter = typeof saved.chapter === "number" ? saved.chapter : Number(saved.chapter);
  if (!bookName || !Number.isInteger(chapter)) return null;
  const book = books.find((item) => item.name === bookName);
  if (!book || chapter < 1 || chapter > book.chapters) return null;
  return { place: { book: book.name, chapter }, book };
}

function normalizeReadingHistory(value: unknown): ReadingHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const normalized = normalizeSavedPlace(item);
    if (!normalized || !item || typeof item !== "object") return [];
    const visitedAt = typeof (item as { visitedAt?: unknown }).visitedAt === "string"
      ? (item as { visitedAt: string }).visitedAt
      : "";
    if (!visitedAt || Number.isNaN(Date.parse(visitedAt))) return [];
    const key = `${normalized.place.book}-${normalized.place.chapter}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...normalized.place, visitedAt }];
  }).slice(0, READING_HISTORY_LIMIT);
}

function nextReadingHistory(current: ReadingHistoryEntry[], bookName: string, chapterNumber: number): ReadingHistoryEntry[] {
  const book = books.find((item) => item.name === bookName);
  if (!book || chapterNumber < 1 || chapterNumber > book.chapters) return current;
  const nextEntry = { book: book.name, chapter: chapterNumber, visitedAt: new Date().toISOString() };
  return [
    nextEntry,
    ...current.filter((entry) => !(entry.book === nextEntry.book && entry.chapter === nextEntry.chapter)),
  ].slice(0, READING_HISTORY_LIMIT);
}

const bookReferenceAliases: Record<string, string> = {
  ge: "Genesis", gen: "Genesis", genesis: "Genesis",
  ex: "Exodus", exo: "Exodus", exod: "Exodus", exodus: "Exodus",
  le: "Leviticus", lev: "Leviticus", leviticus: "Leviticus",
  nu: "Numbers", num: "Numbers", numb: "Numbers", numbers: "Numbers",
  de: "Deuteronomy", deut: "Deuteronomy", deuteronomy: "Deuteronomy",
  jos: "Joshua", josh: "Joshua", joshua: "Joshua",
  judg: "Judges", judges: "Judges", jdg: "Judges",
  ru: "Ruth", ruth: "Ruth",
  "1sa": "1 Samuel", "1sam": "1 Samuel", "1samuel": "1 Samuel", "1sm": "1 Samuel",
  "2sa": "2 Samuel", "2sam": "2 Samuel", "2samuel": "2 Samuel", "2sm": "2 Samuel",
  "1ki": "1 Kings", "1kgs": "1 Kings", "1kings": "1 Kings",
  "2ki": "2 Kings", "2kgs": "2 Kings", "2kings": "2 Kings",
  "1ch": "1 Chronicles", "1chr": "1 Chronicles", "1chronicles": "1 Chronicles",
  "2ch": "2 Chronicles", "2chr": "2 Chronicles", "2chronicles": "2 Chronicles",
  ezr: "Ezra", ezra: "Ezra",
  ne: "Nehemiah", neh: "Nehemiah", nehemiah: "Nehemiah",
  es: "Esther", est: "Esther", esther: "Esther",
  job: "Job",
  ps: "Psalms", psa: "Psalms", psalm: "Psalms", psalms: "Psalms",
  pr: "Proverbs", prov: "Proverbs", proverbs: "Proverbs",
  ec: "Ecclesiastes", eccles: "Ecclesiastes", eccl: "Ecclesiastes", ecclesiastes: "Ecclesiastes",
  song: "Song of Solomon", sos: "Song of Solomon", solomon: "Song of Solomon",
  isa: "Isaiah", is: "Isaiah", isaiah: "Isaiah",
  jer: "Jeremiah", jeremiah: "Jeremiah",
  la: "Lamentations", lam: "Lamentations", lamentations: "Lamentations",
  eze: "Ezekiel", ezek: "Ezekiel", ezekiel: "Ezekiel",
  da: "Daniel", dan: "Daniel", daniel: "Daniel",
  ho: "Hosea", hos: "Hosea", hosea: "Hosea",
  joe: "Joel", joel: "Joel",
  am: "Amos", amos: "Amos",
  ob: "Obadiah", obad: "Obadiah", obadiah: "Obadiah",
  jon: "Jonah", jonah: "Jonah",
  mic: "Micah", micah: "Micah",
  na: "Nahum", nah: "Nahum", nahum: "Nahum",
  hab: "Habakkuk", habakkuk: "Habakkuk",
  zep: "Zephaniah", zeph: "Zephaniah", zephaniah: "Zephaniah",
  hag: "Haggai", haggai: "Haggai",
  zec: "Zechariah", zech: "Zechariah", zechariah: "Zechariah",
  mal: "Malachi", malachi: "Malachi",
  mt: "Matthew", mat: "Matthew", matt: "Matthew", matthew: "Matthew",
  mr: "Mark", mar: "Mark", mark: "Mark", mk: "Mark",
  lu: "Luke", luk: "Luke", luke: "Luke", lk: "Luke",
  joh: "John", john: "John", jn: "John",
  ac: "Acts", act: "Acts", acts: "Acts",
  ro: "Romans", rom: "Romans", romans: "Romans",
  "1co": "1 Corinthians", "1cor": "1 Corinthians", "1corinthians": "1 Corinthians",
  "2co": "2 Corinthians", "2cor": "2 Corinthians", "2corinthians": "2 Corinthians",
  ga: "Galatians", gal: "Galatians", galatians: "Galatians",
  eph: "Ephesians", ephesians: "Ephesians",
  php: "Philippians", phil: "Philippians", philippians: "Philippians",
  col: "Colossians", colossians: "Colossians",
  "1th": "1 Thessalonians", "1thess": "1 Thessalonians", "1thessalonians": "1 Thessalonians",
  "2th": "2 Thessalonians", "2thess": "2 Thessalonians", "2thessalonians": "2 Thessalonians",
  "1ti": "1 Timothy", "1tim": "1 Timothy", "1timothy": "1 Timothy",
  "2ti": "2 Timothy", "2tim": "2 Timothy", "2timothy": "2 Timothy",
  tit: "Titus", titus: "Titus",
  phm: "Philemon", philemon: "Philemon",
  heb: "Hebrews", hebrews: "Hebrews",
  jas: "James", jam: "James", james: "James",
  "1pe": "1 Peter", "1pet": "1 Peter", "1peter": "1 Peter",
  "2pe": "2 Peter", "2pet": "2 Peter", "2peter": "2 Peter",
  "1jo": "1 John", "1joh": "1 John", "1john": "1 John", "1jn": "1 John",
  "2jo": "2 John", "2joh": "2 John", "2john": "2 John", "2jn": "2 John",
  "3jo": "3 John", "3joh": "3 John", "3john": "3 John", "3jn": "3 John",
  jude: "Jude", jud: "Jude",
  re: "Revelation", rev: "Revelation", revelation: "Revelation",
};

const genesisOne = [
  "In the beginning God created the heaven and the earth.",
  "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
  "And God said, Let there be light: and there was light.",
  "And God saw the light, that it was good: and God divided the light from the darkness.",
  "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
  "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.",
  "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.",
  "And God called the firmament Heaven. And the evening and the morning were the second day.",
  "And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.",
  "And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good.",
  "And God said, Let the earth bring forth grass, the herb yielding seed, and the fruit tree yielding fruit after his kind, whose seed is in itself, upon the earth: and it was so.",
  "And the earth brought forth grass, and herb yielding seed after his kind, and the tree yielding fruit, whose seed was in itself, after his kind: and God saw that it was good.",
  "And the evening and the morning were the third day.",
  "And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years:",
  "And let them be for lights in the firmament of the heaven to give light upon the earth: and it was so.",
  "And God made two great lights; the greater light to rule the day, and the lesser light to rule the night: he made the stars also.",
  "And God set them in the firmament of the heaven to give light upon the earth,",
  "And to rule over the day and over the night, and to divide the light from the darkness: and God saw that it was good.",
  "And the evening and the morning were the fourth day.",
  "And God said, Let the waters bring forth abundantly the moving creature that hath life, and fowl that may fly above the earth in the open firmament of heaven.",
  "And God created great whales, and every living creature that moveth, which the waters brought forth abundantly, after their kind, and every winged fowl after his kind: and God saw that it was good.",
  "And God blessed them, saying, Be fruitful, and multiply, and fill the waters in the seas, and let fowl multiply in the earth.",
  "And the evening and the morning were the fifth day.",
  "And God said, Let the earth bring forth the living creature after his kind, cattle, and creeping thing, and beast of the earth after his kind: and it was so.",
  "And God made the beast of the earth after his kind, and cattle after their kind, and every thing that creepeth upon the earth after his kind: and God saw that it was good.",
  "And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth.",
  "So God created man in his own image, in the image of God created he him; male and female created he them.",
  "And God blessed them, and God said unto them, Be fruitful, and multiply, and replenish the earth, and subdue it: and have dominion over the fish of the sea, and over the fowl of the air, and over every living thing that moveth upon the earth.",
  "And God said, Behold, I have given you every herb bearing seed, which is upon the face of all the earth, and every tree, in the which is the fruit of a tree yielding seed; to you it shall be for meat.",
  "And to every beast of the earth, and to every fowl of the air, and to every thing that creepeth upon the earth, wherein there is life, I have given every green herb for meat: and it was so.",
  "And God saw every thing that he had made, and, behold, it was very good. And the evening and the morning were the sixth day.",
].map((text, index) => ({ id: index + 1, reference: `Genesis 1:${index + 1}`, text }));

const hebrewLexicon: LexiconEntry[] = [
  { word: "בְּרֵאשִׁית", transliteration: "bərēʾšît", pronunciation: "beh-ray-SHEET", spoken: "beh ray sheet", number: "H7225", meaning: "beginning, first, chief", lang: "he-IL" },
  { word: "אֱלֹהִים", transliteration: "ʾĕlōhîm", pronunciation: "el-oh-HEEM", spoken: "el oh heem", number: "H430", meaning: "God, divine one", lang: "he-IL" },
  { word: "בָּרָא", transliteration: "bārāʾ", pronunciation: "bah-RAH", spoken: "bah rah", number: "H1254", meaning: "to create, shape", lang: "he-IL" },
];

const greekLexicon: LexiconEntry[] = [
  { word: "ἀρχή", transliteration: "archē", pronunciation: "ar-KHAY", spoken: "ar khay", number: "G746", meaning: "beginning, origin, first cause", lang: "el-GR" },
  { word: "θεός", transliteration: "theos", pronunciation: "theh-OSS", spoken: "theh oss", number: "G2316", meaning: "God, deity", lang: "el-GR" },
  { word: "λόγος", transliteration: "logos", pronunciation: "LOH-goss", spoken: "loh goss", number: "G3056", meaning: "word, message, reason", lang: "el-GR" },
];

function davidVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return english.find((voice) => voice.name.toLowerCase().includes("microsoft david"));
}

function bestVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return davidVoice(voices) || english.find((voice) => voice.localService) || english[0] || voices[0];
}

function bookSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function bibleHubBookSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function commentarySourceId(view: CommentaryView) {
  if (view === "jfb") return "jfb";
  if (view === "clarke") return "clarke";
  return "mhcc";
}

function commentarySourceLabel(view: CommentaryView) {
  if (view === "jfb") return "Historical context";
  if (view === "clarke") return "Background";
  return "Commentary";
}

function commentarySourceInitials(source: CommentarySource) {
  if (source.id === "jfb") return "JFB";
  if (source.id === "clarke") return "AC";
  return "MH";
}

function commentaryResourceInfo(view: CommentaryView, bookName: string, chapterNumber: number): CommentaryResourceInfo {
  if (view === "jfb") {
    return {
      view,
      title: "Commentary Critical and Explanatory on the Whole Bible",
      author: "Robert Jamieson, A. R. Fausset, and David Brown",
      source: "CCEL public-domain HTML edition",
      where: "Bundled locally in Selah and drawn from the public-domain CCEL edition.",
      bestFor: "Concise historical context, cross-references, and verse-level explanation.",
      summary: "The tightest study layer in the app. JFB is especially useful when you want a compact, historically grounded read without a lot of devotional expansion.",
      tag: "Historical",
      linkLabel: "Open JFB source",
      linkUrl: () => "https://ccel.org/j/jfb/jfb/JFB00.htm",
    };
  }

  if (view === "clarke") {
    return {
      view,
      title: "Adam Clarke's Commentary",
      author: "Adam Clarke",
      source: "BibleHub chapter pages",
      where: "Linked out chapter by chapter so the app stays within the legal line while giving you the full external source.",
      bestFor: "Broader background, longer explanation, and deeper chapter-level context.",
      summary: "This is the fullest background layer. It is useful when you want a slower, more expansive walk through the passage and don’t mind jumping out to the chapter source.",
      tag: "Background",
      linkLabel: `Open ${bookName} ${chapterNumber} in Clarke`,
      linkUrl: (name, chapter) => clarkeCommentaryUrl(name, chapter),
    };
  }

  return {
    view,
    title: "Matthew Henry's Concise Commentary on the Whole Bible",
    author: "Matthew Henry",
    source: "CrossWire SWORD module",
    where: "Bundled locally from the public-domain CrossWire MHCC module.",
    bestFor: "Devotional and expository reading with clear, pastoral application.",
    summary: "This is the app's main devotional commentary. It gives you a steady, readable explanation of the passage with an emphasis on application.",
    tag: "Devotional",
    linkLabel: "Open MHCC source",
    linkUrl: () => "https://crosswire.org/sword/modules/ModInfo.jsp?modName=MHCC",
  };
}

function clarkeCommentaryUrl(bookName: string, chapterNumber: number) {
  return `https://biblehub.com/commentaries/clarke/${bibleHubBookSlug(bookName)}/${chapterNumber}.htm`;
}

function chapterAudioBase(book: string, chapterNumber: number) {
  return `/audio/${bookSlug(book)}/${chapterNumber}`;
}

function chapterMp3AudioPath(book: string, chapterNumber: number) {
  return `/audio/${bookSlug(book)}/${chapterNumber}.mp3`;
}

function bibleFileName(name: string) {
  return `${name.replace(/\s+/g, "")}.json`;
}

function normalizedBookReferenceName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findReferenceBook(rawBook: string) {
  const normalized = normalizedBookReferenceName(rawBook);
  const alias = bookReferenceAliases[normalized];
  return books.find((book) => book.name === alias)
    || books.find((book) => normalizedBookReferenceName(book.name) === normalized)
    || null;
}

function passageHref(book: Book, chapterNumber: number, verseNumber = 1) {
  const params = new URLSearchParams({
    book: book.name,
    chapter: String(chapterNumber),
    verse: String(verseNumber),
  });
  return `/?${params.toString()}`;
}

function passageFromSearchParams(params: URLSearchParams) {
  const bookName = params.get("book");
  const chapterNumber = Number(params.get("chapter"));
  const verseNumber = Number(params.get("verse") || "1");
  if (!bookName || !Number.isFinite(chapterNumber) || !Number.isFinite(verseNumber)) return null;
  const book = books.find((item) => item.name === bookName);
  if (!book || chapterNumber < 1 || chapterNumber > book.chapters || verseNumber < 1) return null;
  return { book, chapter: chapterNumber, verse: verseNumber };
}

function parsePassageReference(rawReference: string) {
  const firstReference = rawReference.split(/[;,]/)[0]?.trim();
  if (!firstReference) return null;

  const osisMatch = firstReference.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)/);
  if (osisMatch) {
    const book = findReferenceBook(osisMatch[1]);
    const chapterNumber = Number(osisMatch[2]);
    const verseNumber = Number(osisMatch[3]);
    if (book && chapterNumber >= 1 && chapterNumber <= book.chapters && verseNumber >= 1) return { book, chapter: chapterNumber, verse: verseNumber };
  }

  const textMatch = firstReference.match(/^([1-3]?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)(?:\.|\s)+(\d+):(\d+)/i);
  if (!textMatch) return null;
  const book = findReferenceBook(textMatch[1]);
  const chapterNumber = Number(textMatch[2]);
  const verseNumber = Number(textMatch[3]);
  if (!book || chapterNumber < 1 || chapterNumber > book.chapters || verseNumber < 1) return null;
  return { book, chapter: chapterNumber, verse: verseNumber };
}

function commentaryReferenceHref(reference: CommentaryReference) {
  const passage = parsePassageReference(reference.osis) || parsePassageReference(reference.label);
  return passage ? passageHref(passage.book, passage.chapter, passage.verse) : "";
}

function commentaryReferenceLinks(text: string, references: CommentaryReference[]) {
  const usedRanges: { start: number; end: number }[] = [];
  return references
    .map((reference) => {
      const href = commentaryReferenceHref(reference);
      if (!href) return null;
      const labels = [reference.label, reference.osis.replace(/\./g, " ")].filter(Boolean);
      const match = labels
        .map((label) => ({ label, start: text.indexOf(label) }))
        .filter((item) => item.start >= 0)
        .sort((a, b) => b.label.length - a.label.length)[0];
      if (!match) return null;
      const end = match.start + match.label.length;
      if (usedRanges.some((range) => match.start < range.end && end > range.start)) return null;
      usedRanges.push({ start: match.start, end });
      return { ...reference, href, start: match.start, end } as CommentaryReferenceLink;
    })
    .filter((reference): reference is CommentaryReferenceLink => Boolean(reference))
    .sort((a, b) => a.start - b.start);
}

function samePassage(a: { book: Book; chapter: number; verse: number }, b: { book: Book; chapter: number; verse: number }) {
  return a.book.name === b.book.name && a.chapter === b.chapter && a.verse === b.verse;
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const searchStopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "he", "her", "his", "i", "in", "into",
  "is", "it", "me", "my", "of", "on", "or", "our", "she", "that", "the", "their", "them", "there", "they", "this",
  "to", "unto", "was", "we", "were", "what", "when", "which", "who", "with", "ye", "you", "your",
]);

function searchTerms(text: string) {
  return normalizeSearchText(text).split(" ").filter(Boolean);
}

function searchHighlightTerms(query: string) {
  const terms = searchTerms(query).filter((word) => word.length > 1 && !searchStopWords.has(word));
  return terms.length ? terms : searchTerms(query).filter((word) => word.length > 1);
}

function savedTextCacheKey(book: string, chapterNumber: number) {
  return `${bookSlug(book)}-${chapterNumber}`;
}

function formatNoteReference(book: string, chapterNumber: number, verseIds: number[]) {
  const sorted = [...verseIds].sort((a, b) => a - b);
  if (sorted.length > 2) return `${book} ${chapterNumber}:${sorted[0]}–${sorted[sorted.length - 1]}`;
  return `${book} ${chapterNumber}:${sorted.join(", ")}`;
}

function readingHistoryDateLabel(visitedAt: string) {
  const visited = new Date(visitedAt);
  if (Number.isNaN(visited.getTime())) return "Earlier";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfVisited = new Date(visited.getFullYear(), visited.getMonth(), visited.getDate()).getTime();
  const dayDifference = Math.round((startOfToday - startOfVisited) / 86400000);
  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  return visited.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function parseSavedReference(key: string): SavedReference | null {
  const book = [...books].sort((a, b) => b.name.length - a.name.length).find((item) => key.startsWith(`${item.name}-`));
  if (!book) return null;
  const remainder = key.slice(book.name.length + 1);
  const sectionMatch = remainder.match(/^(\d+)-section-(\d+(?:_\d+)*)$/);
  const verseMatch = remainder.match(/^(\d+)-(\d+)$/);
  const chapterNumber = Number(sectionMatch?.[1] || verseMatch?.[1]);
  const verseIds = sectionMatch ? sectionMatch[2].split("_").map(Number) : verseMatch ? [Number(verseMatch[2])] : [];
  if (!chapterNumber || !verseIds.length) return null;
  return { key, book, chapter: chapterNumber, verseIds, reference: formatNoteReference(book.name, chapterNumber, verseIds) };
}

function excerptText(text: string, maxLength = 190) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const trimmed = clean.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 80 ? lastSpace : trimmed.length).trim()}...`;
}

function searchExcerptParts(text: string, query: string, maxLength = 260) {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  const queryTerms = [query.trim(), ...query.trim().split(/\s+/)].filter((term) => term.length > 1);
  const matchTerm = queryTerms.find((term) => lower.includes(term.toLowerCase()));
  if (!matchTerm) return { before: excerptText(clean, maxLength), match: "", after: "" };

  const matchIndex = lower.indexOf(matchTerm.toLowerCase());
  const windowStart = Math.max(0, matchIndex - Math.floor((maxLength - matchTerm.length) / 2));
  const windowEnd = Math.min(clean.length, windowStart + maxLength);
  const prefix = windowStart > 0 ? "..." : "";
  const suffix = windowEnd < clean.length ? "..." : "";
  const excerpt = `${prefix}${clean.slice(windowStart, windowEnd)}${suffix}`;
  const adjustedIndex = matchIndex - windowStart + prefix.length;
  return {
    before: excerpt.slice(0, adjustedIndex),
    match: excerpt.slice(adjustedIndex, adjustedIndex + matchTerm.length),
    after: excerpt.slice(adjustedIndex + matchTerm.length),
  };
}

function verseWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length || 1;
}

export default function Home() {
  const showDevBadge = false;
  const [selectedBook, setSelectedBook] = useState(books[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>(genesisOne);
  const [picker, setPicker] = useState<Picker>(null);
  const [bookFilter, setBookFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadNotice, setLoadNotice] = useState("");
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(DEFAULT_READ_ALOUD_RATE);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [savedAudioChapters, setSavedAudioChapters] = useState<Set<string>>(new Set());
  const [chapterAudioFiles, setChapterAudioFiles] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState<Record<string, HighlightColor>>({});
  const [savedTextCache, setSavedTextCache] = useState<SavedTextCache>({});
  const [redLetterMap, setRedLetterMap] = useState<Record<string, string>>({});
  const [preferredHighlightColor, setPreferredHighlightColor] = useState<HighlightColor>("gold");
  const [highlightMeanings, setHighlightMeanings] = useState<HighlightMeaningMap>({ gold: "", sage: "", blue: "", rose: "" });
  const [highlightMeaningColor, setHighlightMeaningColor] = useState<HighlightColor>("gold");
  const [highlightMeaningSectionOpen, setHighlightMeaningSectionOpen] = useState(true);
  const [selectedForHighlight, setSelectedForHighlight] = useState<number[]>([]);
  const [selectedWord, setSelectedWord] = useState("");
  const [selectedWordKey, setSelectedWordKey] = useState("");
  const [selectedOriginalEntries, setSelectedOriginalEntries] = useState<LexiconEntry[]>([]);
  const [originalLookupStatus, setOriginalLookupStatus] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");
  const [wordStudyMode, setWordStudyMode] = useState(false);
  const [openVerseMenu, setOpenVerseMenu] = useState<number | null>(null);
  const [inlineNoteVerse, setInlineNoteVerse] = useState<number | null>(null);
  const [inlineSectionNoteIds, setInlineSectionNoteIds] = useState<number[]>([]);
  const [inlineNoteDraft, setInlineNoteDraft] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [studyTab, setStudyTab] = useState<StudyTab>("commentary");
  const [commentaryView, setCommentaryView] = useState<CommentaryView>("expository");
  const [studyCollapsed, setStudyCollapsed] = useState(false);
  const [mobileStudyOpen, setMobileStudyOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [audioDockEnabled, setAudioDockEnabled] = useState(true);
  const [audioDockCollapsed, setAudioDockCollapsed] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [audioSourcePreference, setAudioSourcePreference] = useState<AudioSourcePreference>("auto");
  const [studyPanelWidth, setStudyPanelWidth] = useState(MIN_STUDY_PANEL_WIDTH);
  const [isResizingStudy, setIsResizingStudy] = useState(false);
  const [readOriginalDefinition, setReadOriginalDefinition] = useState(false);
  const [commentaryData, setCommentaryData] = useState<CommentaryChapter | null>(null);
  const [commentaryStatus, setCommentaryStatus] = useState<"loading" | "ready" | "error" | "linked">("loading");
  const [commentaryReferenceTab, setCommentaryReferenceTab] = useState<CommentaryReferenceTab | null>(null);
  const [commentaryResourceOpen, setCommentaryResourceOpen] = useState(false);
  const [commentaryResourceView, setCommentaryResourceView] = useState<CommentaryView>("expository");
  const [bookmark, setBookmark] = useState<SavedPlace | null>(null);
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryEntry[]>([]);
  const [readingHistoryReady, setReadingHistoryReady] = useState(false);
  const [readingHistoryOpen, setReadingHistoryOpen] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [savedViewTab, setSavedViewTab] = useState<"highlights" | "notes">("highlights");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "ready" | "error">("idle");
  const [activeSnippetReadKey, setActiveSnippetReadKey] = useState("");
  const [isReadingCommentary, setIsReadingCommentary] = useState(false);
  const [isCommentaryPaused, setIsCommentaryPaused] = useState(false);
  const [commentaryWordIndex, setCommentaryWordIndex] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateAvailableVersion, setUpdateAvailableVersion] = useState("");
  const [updateMessage, setUpdateMessage] = useState("Ready to check for a newer Selah build.");
  const [releaseNotesModal, setReleaseNotesModal] = useState<PendingReleaseNotes | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionHistoryNotes, setVersionHistoryNotes] = useState<ReleaseNote[]>([]);
  const cancelled = useRef(false);
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const syncedAudioVerse = useRef<number | null>(null);
  const passagePickerRef = useRef<HTMLDivElement | null>(null);
  const savedPanelRef = useRef<HTMLDivElement | null>(null);
  const studyPanelRef = useRef<HTMLElement | null>(null);
  const studyResizeStart = useRef({ x: 0, width: MIN_STUDY_PANEL_WIDTH });
  const pendingSavedVerse = useRef<number | null>(null);
  const bibleBookCache = useRef<Record<string, BibleSourceBook>>({});
  const originalLanguageBookCache = useRef<Record<string, OriginalLanguageBook>>({});
  const strongDictionaryCache = useRef<Partial<Record<"hebrew" | "greek", StrongDictionary>>>({});
  const wordLookupSession = useRef(0);
  const readingSession = useRef(0);

  const passageKey = `${selectedBook.name}-${chapter}`;
  const verseKey = (id: number) => `${passageKey}-${id}`;
  const chapterAudioKey = `${bookSlug(selectedBook.name)}-${chapter}`;
  const chapterAudioPrefix = chapterAudioBase(selectedBook.name, chapter);
  const chapterMp3Url = chapterAudioFiles[chapterAudioKey] || chapterMp3AudioPath(selectedBook.name, chapter);
  const hasChapterMp3Audio = Boolean(chapterAudioFiles[chapterAudioKey]);
  const shouldUseChapterMp3Audio = OFFICIAL_AUDIO_ENABLED && hasChapterMp3Audio && audioSourcePreference !== "david";
  const selected = verses.find((verse) => verse.id === selectedVerse) || verses[0];
  const chapterAudioProgress = useMemo(() => {
    const counts = verses.map((verse) => verseWordCount(verse.text));
    const total = counts.reduce((sum, count) => sum + count, 0) || 1;
    let cumulative = 0;
    return counts.map((count, index) => {
      const start = cumulative / total;
      cumulative += count;
      return { verseId: verses[index]?.id || index + 1, start, end: cumulative / total };
    });
  }, [verses]);

  useEffect(() => {
    if (!commentaryResourceOpen && !releaseNotesModal && !versionHistoryOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [commentaryResourceOpen, releaseNotesModal, versionHistoryOpen]);

  const loadBibleChapter = useCallback(async (bookName: string, chapterNumber: number) => {
    const fileName = bibleFileName(bookName);
    const cached = bibleBookCache.current[fileName];
    let sourceBook = cached;

    if (!sourceBook) {
      const response = await fetch(`/bible/kjv/${fileName}`);
      if (!response.ok) throw new Error("Chapter file unavailable");
      sourceBook = await response.json() as BibleSourceBook;
      bibleBookCache.current[fileName] = sourceBook;
    }

    const sourceChapter = sourceBook.chapters.find((item) => Number(item.chapter) === chapterNumber);
    if (!sourceChapter) throw new Error("Chapter missing from local Bible data");

    return sourceChapter.verses.map((verse) => ({
      id: Number(verse.verse),
      reference: `${bookName} ${chapterNumber}:${verse.verse}`,
      text: verse.text.trim(),
    })) as Verse[];
  }, []);

  const showReleaseNotesFromManifest = async (fromVersion: string, toVersion = APP_VERSION) => {
    if (compareVersions(toVersion, fromVersion) <= 0) return;
    try {
      const response = await fetch(`${APP_VERSION_MANIFEST_URL}?notes=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Version manifest unavailable");
      const manifest = await response.json() as AppVersionManifest;
      const releases = releaseNotesForUpdate(manifest, fromVersion, toVersion);
      if (releases.length) {
        setReleaseNotesModal({ fromVersion, toVersion, releases });
        localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, toVersion);
      }
    } catch {
      setReleaseNotesModal({
        fromVersion,
        toVersion,
        releases: [{
          version: toVersion,
          title: "Selah update",
          changes: ["Selah has been updated to the latest version."],
        }],
      });
      localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, toVersion);
    }
  };

  const openVersionHistory = async () => {
    setVersionHistoryOpen(true);
    setVersionHistoryNotes([{ version: APP_VERSION, title: "Loading version history", changes: ["Checking the update board..."] }]);
    const historyUrls = [`${APP_VERSION_MANIFEST_URL}?history=${Date.now()}`, `/app-version.json?history=${Date.now()}`];
    for (const url of historyUrls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Version history unavailable");
        const manifest = await response.json() as AppVersionManifest;
        const releases = allReleaseNotes(manifest);
        if (releases.length) {
          setVersionHistoryNotes(releases);
          return;
        }
      } catch {
        // Try the next history source.
      }
    }
    setVersionHistoryNotes([{ version: APP_VERSION, title: "Version history unavailable", changes: ["Selah could not load the update board right now."] }]);
  };

  useEffect(() => {
    queueMicrotask(() => {
      const savedHighlights = localStorage.getItem("selah-highlights-v2");
      const savedNotes = localStorage.getItem("selah-notes-v2");
      const savedPlace = localStorage.getItem("selah-reading-place-v1");
      const savedReadingHistory = localStorage.getItem(READING_HISTORY_STORAGE_KEY);
      const savedHighlightColor = localStorage.getItem("selah-highlight-color") as HighlightColor | null;
      const savedHighlightMeanings = localStorage.getItem("selah-highlight-meanings-v1");
      const savedHighlightMeaningSectionOpen = localStorage.getItem("selah-highlight-meaning-section-open");
      const savedDockCollapsed = localStorage.getItem("selah-audio-dock-collapsed");
      const savedAudioDockEnabled = localStorage.getItem("selah-audio-dock-enabled");
      const savedTheme = localStorage.getItem("selah-theme") as ThemePreference | null;
      const savedAudioSource = localStorage.getItem("selah-audio-source") as AudioSourcePreference | null;
      const savedOriginalDefinition = localStorage.getItem("selah-read-original-definition");
      const savedStudyPanelWidth = Number(localStorage.getItem(STUDY_PANEL_WIDTH_STORAGE_KEY));
      const pendingReleaseNotes = localStorage.getItem(UPDATE_NOTES_STORAGE_KEY);
      const searchParams = new URLSearchParams(window.location.search);
      let restoredPlace: { place: SavedPlace; book: Book } | null = null;
      if (pendingReleaseNotes) {
        try {
          const parsed = JSON.parse(pendingReleaseNotes) as PendingReleaseNotes;
          if (parsed.toVersion && compareVersions(APP_VERSION, parsed.toVersion) >= 0 && parsed.releases?.length) {
            setReleaseNotesModal(parsed);
            localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, parsed.toVersion);
          }
        } catch {
          // Ignore malformed pending update notes.
        } finally {
          localStorage.removeItem(UPDATE_NOTES_STORAGE_KEY);
        }
      } else {
        const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY);
        let backupVersion = "";
        try {
          const backup = JSON.parse(localStorage.getItem("selah-update-backup-v1") || "{}") as { version?: string };
          backupVersion = backup.version || "";
        } catch {
          backupVersion = "";
        }
        const updateRefreshVersion = searchParams.has("updated") ? backupVersion || lastSeenVersion || "" : "";
        if (updateRefreshVersion && compareVersions(APP_VERSION, updateRefreshVersion) > 0) {
          void showReleaseNotesFromManifest(updateRefreshVersion);
          searchParams.delete("updated");
          const nextQuery = searchParams.toString();
          const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
          window.history.replaceState({}, "", nextUrl);
        } else if (!lastSeenVersion || compareVersions(APP_VERSION, lastSeenVersion) > 0) {
          localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, APP_VERSION);
        }
      }
      if (savedHighlights) {
        const parsed = JSON.parse(savedHighlights) as string[] | Record<string, HighlightColor>;
        setHighlights(Array.isArray(parsed) ? Object.fromEntries(parsed.map((key) => [key, "gold" as HighlightColor])) : parsed);
      }
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedReadingHistory) {
        try {
          setReadingHistory(normalizeReadingHistory(JSON.parse(savedReadingHistory)));
        } catch {
          localStorage.removeItem(READING_HISTORY_STORAGE_KEY);
        }
      }
      if (savedPlace) {
        try {
          restoredPlace = normalizeSavedPlace(JSON.parse(savedPlace));
          if (restoredPlace) setBookmark(restoredPlace.place);
          else localStorage.removeItem("selah-reading-place-v1");
        } catch {
          localStorage.removeItem("selah-reading-place-v1");
        }
      }
      if (savedHighlightColor && ["gold", "sage", "blue", "rose"].includes(savedHighlightColor)) setPreferredHighlightColor(savedHighlightColor);
      if (savedHighlightMeanings) {
        try {
          const parsed = JSON.parse(savedHighlightMeanings) as Partial<HighlightMeaningMap>;
          setHighlightMeanings({
            gold: typeof parsed.gold === "string" ? parsed.gold : "",
            sage: typeof parsed.sage === "string" ? parsed.sage : "",
            blue: typeof parsed.blue === "string" ? parsed.blue : "",
            rose: typeof parsed.rose === "string" ? parsed.rose : "",
          });
        } catch {
          localStorage.removeItem("selah-highlight-meanings-v1");
        }
      }
      if (savedHighlightMeaningSectionOpen === "false") setHighlightMeaningSectionOpen(false);
      if (savedDockCollapsed === "true") setAudioDockCollapsed(true);
      if (savedTheme && ["system", "light", "dark", "green-dark", "true-dark"].includes(savedTheme)) setThemePreference(savedTheme);
      if (savedAudioSource && ["auto", "official", "david"].includes(savedAudioSource)) {
        setAudioSourcePreference(savedAudioSource === "official" && !OFFICIAL_AUDIO_ENABLED ? "david" : savedAudioSource);
      }
      if (savedOriginalDefinition === "true") setReadOriginalDefinition(true);
      if (savedAudioDockEnabled === "false") setAudioDockEnabled(false);
      if (Number.isFinite(savedStudyPanelWidth)) setStudyPanelWidth(clampNumber(savedStudyPanelWidth, MIN_STUDY_PANEL_WIDTH, MAX_STUDY_PANEL_WIDTH));
      const linkedPassage = passageFromSearchParams(searchParams);
      if (linkedPassage) {
        pendingSavedVerse.current = linkedPassage.verse;
        setSelectedBook(linkedPassage.book);
        setChapter(linkedPassage.chapter);
        setReadingHistoryReady(true);
        return;
      }
      if (restoredPlace) {
        setSelectedBook(restoredPlace.book);
        setChapter(restoredPlace.place.chapter);
      }
      setReadingHistoryReady(true);
    });
  }, []);

  const loadBibleBook = useCallback(async (bookName: string) => {
    const fileName = bibleFileName(bookName);
    const cached = bibleBookCache.current[fileName];
    if (cached) return cached;

    const response = await fetch(`/bible/kjv/${fileName}`);
    if (!response.ok) throw new Error("Bible file unavailable");
    const sourceBook = await response.json() as BibleSourceBook;
    bibleBookCache.current[fileName] = sourceBook;
    return sourceBook;
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolvedTheme = themePreference === "system" ? (media.matches ? "dark" : "light") : themePreference;
      document.documentElement.dataset.theme = resolvedTheme;
    };
    applyTheme();
    if (themePreference === "system") media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themePreference]);

  useEffect(() => {
    if (!isResizingStudy) return;

    const updateStudyWidth = (event: PointerEvent) => {
      event.preventDefault();
      const availableMax = Math.max(MIN_STUDY_PANEL_WIDTH, window.innerWidth - 520);
      const maxWidth = Math.min(MAX_STUDY_PANEL_WIDTH, availableMax);
      const delta = event.clientX - studyResizeStart.current.x;
      const nextWidth = clampNumber(studyResizeStart.current.width - delta, MIN_STUDY_PANEL_WIDTH, maxWidth);
      setStudyPanelWidth(nextWidth);
      localStorage.setItem(STUDY_PANEL_WIDTH_STORAGE_KEY, String(Math.round(nextWidth)));
    };

    const stopResizing = () => setIsResizingStudy(false);
    document.body.classList.add("study-resizing");
    window.addEventListener("pointermove", updateStudyWidth);
    window.addEventListener("pointerup", stopResizing, { once: true });
    window.addEventListener("pointercancel", stopResizing, { once: true });

    return () => {
      document.body.classList.remove("study-resizing");
      window.removeEventListener("pointermove", updateStudyWidth);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [isResizingStudy]);

  useEffect(() => {
    const closeMenusOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (picker === "chapters" && !passagePickerRef.current?.contains(target)) setPicker(null);
      if (searchExpanded && !passagePickerRef.current?.contains(target)) setSearchExpanded(false);
    };
    document.addEventListener("pointerdown", closeMenusOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeMenusOnOutsideClick);
  }, [picker, searchExpanded]);

  const snapshotSavedLibrary = () => {
    const keys = [
      "selah-highlights-v2",
      "selah-notes-v2",
      "selah-reading-place-v1",
      READING_HISTORY_STORAGE_KEY,
      "selah-highlight-color",
      "selah-highlight-meanings-v1",
      "selah-audio-dock-collapsed",
      "selah-audio-dock-enabled",
      "selah-theme",
      "selah-audio-source",
      "selah-read-original-definition",
      STUDY_PANEL_WIDTH_STORAGE_KEY,
    ];
    const saved: Record<string, string> = {};
    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) saved[key] = value;
    });
    localStorage.setItem("selah-update-backup-v1", JSON.stringify({ createdAt: new Date().toISOString(), version: APP_VERSION, saved }));
  };

  const checkForAppUpdate = async () => {
    setUpdateStatus("checking");
    setUpdateMessage("Checking for the latest Selah build...");
    try {
      const cacheBustedUrl = `${APP_VERSION_MANIFEST_URL}?t=${Date.now()}`;
      const response = await fetch(cacheBustedUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Version manifest unavailable");
      const manifest = await response.json() as AppVersionManifest;
      const nextVersion = manifest.latestVersion || manifest.version;
      if (!nextVersion) throw new Error("Version manifest is missing a version");
      if (compareVersions(nextVersion, APP_VERSION) > 0) {
        const releases = releaseNotesForUpdate(manifest, APP_VERSION, nextVersion);
        localStorage.setItem(UPDATE_NOTES_STORAGE_KEY, JSON.stringify({ fromVersion: APP_VERSION, toVersion: nextVersion, releases } satisfies PendingReleaseNotes));
        setUpdateAvailableVersion(nextVersion);
        setUpdateStatus("available");
        setUpdateMessage(`Version ${nextVersion} is available.`);
      } else {
        setUpdateAvailableVersion("");
        setUpdateStatus("current");
        setUpdateMessage("Selah is up to date.");
      }
    } catch {
      setUpdateAvailableVersion("");
      setUpdateStatus("error");
      setUpdateMessage("Selah could not check for updates right now.");
    }
  };

  const applyAppUpdate = async () => {
    snapshotSavedLibrary();
    setUpdateStatus("updating");
    setUpdateMessage(`Installing version ${updateAvailableVersion || "the latest build"}...`);
    try {
      const response = await fetch("/api/update", { method: "POST" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The local updater could not finish.");
      setUpdateMessage("Update installed. Reloading Selah...");
      window.location.replace(`${window.location.pathname}?updated=${Date.now()}`);
    } catch (error) {
      setUpdateStatus("error");
      setUpdateMessage(error instanceof Error ? error.message : "Selah could not install the update.");
    }
  };

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const david = davidVoice(available);
      const nextVoice = david?.name || bestVoice(available)?.name || "";
      setVoiceName(nextVoice);
      if (nextVoice) localStorage.setItem("selah-voice", nextVoice);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/audio/manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SavedAudioManifest | null) => {
        if (!data || ignore) return;
        setSavedAudioChapters(new Set(data.chapters || []));
        setChapterAudioFiles(data.chapterFiles || {});
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/bible/kjv/red-letter.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Record<string, string> | null) => {
        if (!ignore && data) setRedLetterMap(data);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    setCommentaryData(null);
    if (commentaryView === "clarke") {
      setCommentaryStatus("linked");
      return () => { ignore = true; };
    }
    setCommentaryStatus("loading");
    fetch(`/commentary/${commentarySourceId(commentaryView)}/${bookSlug(selectedBook.name)}/${chapter}.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Commentary unavailable");
        return response.json() as Promise<CommentaryChapter>;
      })
      .then((data) => {
        if (ignore) return;
        setCommentaryData(data);
        setCommentaryStatus("ready");
      })
      .catch(() => {
        if (ignore) return;
        setCommentaryStatus("error");
    });
    return () => { ignore = true; };
  }, [selectedBook.name, chapter, commentaryView]);

  useEffect(() => {
    let ignore = false;
    async function loadChapter() {
      setIsLoading(true);
      setLoadNotice("");
      try {
        const chapterVerses = await loadBibleChapter(selectedBook.name, chapter);
        if (!ignore) {
          setVerses(chapterVerses);
          const targetVerse = pendingSavedVerse.current || chapterVerses[0]?.id || 1;
          pendingSavedVerse.current = null;
          setSelectedVerse(targetVerse);
          window.setTimeout(() => document.getElementById(`verse-${targetVerse}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
        }
      } catch {
        if (!ignore) {
          setVerses([]);
          setLoadNotice("This chapter could not be loaded just now. Please choose another chapter or try again.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    queueMicrotask(() => {
      window.speechSynthesis?.cancel();
      if (activeAudio.current) {
        activeAudio.current.pause();
        activeAudio.current.currentTime = 0;
        activeAudio.current = null;
      }
      syncedAudioVerse.current = null;
      setIsReading(false);
      setIsPaused(false);
      setIsReadingCommentary(false);
      setIsCommentaryPaused(false);
      setCommentaryWordIndex(null);
      setActiveSnippetReadKey("");
      setActiveVerse(null);
      setSelectedForHighlight([]);
      setInlineNoteVerse(null);
      setInlineSectionNoteIds([]);
      setInlineNoteDraft("");
      loadChapter();
    });
    return () => { ignore = true; };
  }, [selectedBook, chapter, loadBibleChapter]);

  useEffect(() => {
    wordLookupSession.current += 1;
    setSelectedWord("");
    setSelectedWordKey("");
    setSelectedOriginalEntries([]);
    setOriginalLookupStatus("idle");
  }, [selectedBook.name, chapter]);

  const stopReading = useCallback(() => {
    readingSession.current += 1;
    cancelled.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current.currentTime = 0;
      activeAudio.current = null;
    }
    syncedAudioVerse.current = null;
    setIsReading(false);
    setIsPaused(false);
    setIsReadingCommentary(false);
    setIsCommentaryPaused(false);
    setCommentaryWordIndex(null);
    setActiveSnippetReadKey("");
    setActiveVerse(null);
  }, []);

  function playBrowserVerse(index: number, session = readingSession.current) {
    if (readingSession.current !== session) return;
    const verse = verses[index];
    if (!verse) {
      setIsReading(false);
      setActiveVerse(null);
      return;
    }
    setActiveVerse(verse.id);
    setSelectedVerse(verse.id);
    document.getElementById(`verse-${verse.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!("speechSynthesis" in window)) {
      setIsReading(false);
      setActiveVerse(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.rate = rate;
    utterance.pitch = 0.96;
    const voice = voices.find((item) => item.name === voiceName) || bestVoice(voices);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (readingSession.current !== session) return;
      if (!cancelled.current && index + 1 < verses.length) playBrowserVerse(index + 1, session);
      else if (!cancelled.current) {
        setIsReading(false);
        setActiveVerse(null);
      }
    };
    utterance.onerror = () => {
      if (readingSession.current !== session) return;
      setIsReading(false);
      setActiveVerse(null);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function playSavedChapterAudio(index: number, session = readingSession.current) {
    if (cancelled.current || readingSession.current !== session) return;
    const audio = new Audio(chapterMp3Url);
    activeAudio.current = audio;
    syncedAudioVerse.current = null;
    audio.preload = "auto";

    const syncActiveVerse = () => {
      if (cancelled.current || readingSession.current !== session || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const progress = Math.min(0.9999, Math.max(0, audio.currentTime / audio.duration));
      const activeProgress = chapterAudioProgress.find((item) => progress >= item.start && progress < item.end) || chapterAudioProgress.at(-1);
      if (!activeProgress || syncedAudioVerse.current === activeProgress.verseId) return;
      syncedAudioVerse.current = activeProgress.verseId;
      setActiveVerse(activeProgress.verseId);
      setSelectedVerse(activeProgress.verseId);
      document.getElementById(`verse-${activeProgress.verseId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    audio.onloadedmetadata = () => {
      const target = chapterAudioProgress[index];
      if (target && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.max(0, Math.min(audio.duration - 0.25, audio.duration * target.start));
      }
      syncActiveVerse();
    };
    audio.ontimeupdate = syncActiveVerse;
    audio.onended = () => {
      if (activeAudio.current === audio) activeAudio.current = null;
      if (readingSession.current !== session) return;
      setIsReading(false);
      setIsPaused(false);
      setActiveVerse(null);
      syncedAudioVerse.current = null;
    };
    audio.onerror = () => {
      if (activeAudio.current === audio) activeAudio.current = null;
      if (readingSession.current !== session) return;
      setSavedAudioChapters((current) => {
        const next = new Set(current);
        next.delete(chapterAudioKey);
        return next;
      });
      setChapterAudioFiles((current) => {
        const next = { ...current };
        delete next[chapterAudioKey];
        return next;
      });
      playBrowserVerse(index, session);
    };

    try {
      await audio.play();
      syncActiveVerse();
    } catch {
      if (activeAudio.current === audio) activeAudio.current = null;
      if (readingSession.current === session) playBrowserVerse(index, session);
    }
  }

  async function playSavedVerse(index: number, includeIntro: boolean, session = readingSession.current) {
    if (cancelled.current || readingSession.current !== session) return;
    if (includeIntro) {
      setActiveVerse(null);
      const introOk = await new Promise<boolean>((resolve) => {
        const intro = new Audio(`${chapterAudioPrefix}/intro.wav`);
        activeAudio.current = intro;
        intro.preload = "auto";
        intro.onended = () => {
          if (activeAudio.current === intro) activeAudio.current = null;
          resolve(true);
        };
        intro.onerror = () => {
          if (activeAudio.current === intro) activeAudio.current = null;
          resolve(false);
        };
        intro.play().catch(() => {
          if (activeAudio.current === intro) activeAudio.current = null;
          resolve(false);
        });
      });
      if (cancelled.current || readingSession.current !== session) return;
      if (!introOk) {
        setSavedAudioChapters((current) => {
          const next = new Set(current);
          next.delete(chapterAudioKey);
          return next;
        });
        playBrowserVerse(index, session);
        return;
      }
    }

    if (readingSession.current !== session) return;
    const verse = verses[index];
    if (!verse) {
      setIsReading(false);
      setActiveVerse(null);
      return;
    }

    setActiveVerse(verse.id);
    setSelectedVerse(verse.id);
    document.getElementById(`verse-${verse.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

    const verseOk = await new Promise<boolean>((resolve) => {
      const audio = new Audio(`${chapterAudioPrefix}/${verse.id}.wav`);
      activeAudio.current = audio;
      audio.preload = "auto";
      audio.onended = () => {
        if (activeAudio.current === audio) activeAudio.current = null;
        resolve(true);
      };
      audio.onerror = () => {
        if (activeAudio.current === audio) activeAudio.current = null;
        resolve(false);
      };
      audio.play().catch(() => {
        if (activeAudio.current === audio) activeAudio.current = null;
        resolve(false);
      });
    });

    if (cancelled.current || readingSession.current !== session) return;
    if (!verseOk) {
      setSavedAudioChapters((current) => {
        const next = new Set(current);
        next.delete(chapterAudioKey);
        return next;
      });
      playBrowserVerse(index, session);
      return;
    }

    if (!cancelled.current && readingSession.current === session && index + 1 < verses.length) {
      void playSavedVerse(index + 1, false, session);
    } else if (!cancelled.current) {
      setIsReading(false);
      setActiveVerse(null);
    }
  }

  function startReading(verseId = selectedVerse) {
    if (!verses.length) return;
    const session = readingSession.current + 1;
    readingSession.current = session;
    cancelled.current = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current.currentTime = 0;
      activeAudio.current = null;
    }
    setIsReading(true);
    setIsPaused(false);
    setActiveSnippetReadKey("");
    const index = Math.max(0, verses.findIndex((verse) => verse.id === verseId));
    if (shouldUseChapterMp3Audio) {
      void playSavedChapterAudio(index, session);
      return;
    }
    if (savedAudioChapters.has(chapterAudioKey)) {
      void playSavedVerse(index, verseId === verses[0]?.id, session);
      return;
    }
    playBrowserVerse(index, session);
  }

  const jumpToVerse = (id: number) => {
    const index = Math.max(0, verses.findIndex((verse) => verse.id === id));
    const session = readingSession.current + 1;
    readingSession.current = session;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current.currentTime = 0;
      activeAudio.current = null;
    }
    syncedAudioVerse.current = null;
    cancelled.current = false;
    setIsReading(true);
    setIsPaused(false);
    setActiveSnippetReadKey("");
    if (shouldUseChapterMp3Audio) void playSavedChapterAudio(index, session);
    else if (savedAudioChapters.has(chapterAudioKey)) void playSavedVerse(index, false, session);
    else playBrowserVerse(index, session);
  };

  const togglePause = () => {
    if (activeAudio.current) {
      if (isPaused) void activeAudio.current.play();
      else activeAudio.current.pause();
    } else if ("speechSynthesis" in window) {
      if (isPaused) window.speechSynthesis.resume();
      else window.speechSynthesis.pause();
    }
    setIsPaused(!isPaused);
  };

  const handleVersePlayback = (id: number) => {
    setSelectedVerse(id);
    if (activeVerse === id && isReading) togglePause();
    else startReading(id);
  };

  const toggleVerseSelection = (id: number) => {
    setSelectedVerse(id);
    setSelectedForHighlight((current) => {
      const sorted = [...current].sort((a, b) => a - b);
      if (!sorted.length) return [id];
      if (sorted.includes(id)) {
        if (id === sorted[0] || id === sorted[sorted.length - 1]) return sorted.filter((verseId) => verseId !== id);
        return [id];
      }
      if (id === sorted[0] - 1 || id === sorted[sorted.length - 1] + 1) return [...sorted, id].sort((a, b) => a - b);
      return [id];
    });
  };

  const applyHighlight = (color?: HighlightColor) => {
    const next = { ...highlights };
    selectedForHighlight.forEach((id) => {
      const key = verseKey(id);
      if (color) {
        delete next[key];
        next[key] = color;
      }
      else delete next[key];
    });
    setHighlights(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
    if (color) {
      setPreferredHighlightColor(color);
      localStorage.setItem("selah-highlight-color", color);
    }
    setSelectedForHighlight([]);
  };

  const toggleHighlight = (id: number) => {
    const key = verseKey(id);
    const next = { ...highlights };
    if (next[key]) delete next[key];
    else {
      delete next[key];
      next[key] = preferredHighlightColor;
    }
    setHighlights(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
  };

  const setVerseHighlight = (id: number, color?: HighlightColor) => {
    const key = verseKey(id);
    const next = { ...highlights };
    if (color) {
      delete next[key];
      next[key] = color;
    }
    else delete next[key];
    setHighlights(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
    if (color) {
      setPreferredHighlightColor(color);
      localStorage.setItem("selah-highlight-color", color);
    }
    setOpenVerseMenu(null);
  };

  const updateHighlightMeaning = (color: HighlightColor, meaning: string) => {
    const next = {
      ...highlightMeanings,
      [color]: meaning,
    };
    setHighlightMeanings(next);
    localStorage.setItem("selah-highlight-meanings-v1", JSON.stringify(next));
  };

  const resetHighlightMeanings = () => {
    const cleared: HighlightMeaningMap = { gold: "", sage: "", blue: "", rose: "" };
    setHighlightMeanings(cleared);
    localStorage.setItem("selah-highlight-meanings-v1", JSON.stringify(cleared));
  };

  const selectWord = async (word: string, verseId: number, wordKey: string, wordOrdinal: number, wordOccurrence: number) => {
    const cleaned = word.replace(/[^\p{L}\p{M}’'-]/gu, "");
    if (!cleaned) return;
    const lookupSession = ++wordLookupSession.current;
    setSelectedWord(cleaned);
    setSelectedWordKey(wordKey);
    setSelectedOriginalEntries([]);
    setOriginalLookupStatus("loading");
    setSelectedVerse(verseId);
    setStudyTab("lexicon");
    setStudyCollapsed(false);
    setMobileStudyOpen(true);

    try {
      const bookFile = bibleFileName(selectedBook.name);
      let languageBook = originalLanguageBookCache.current[bookFile];
      if (!languageBook) {
        const response = await fetch(`/original-language/kjv/${bookFile}`);
        if (!response.ok) throw new Error("Original-language tagging unavailable");
        languageBook = await response.json() as OriginalLanguageBook;
        originalLanguageBookCache.current[bookFile] = languageBook;
      }

      const language = selectedBook.testament === "Old Testament" ? "hebrew" : "greek";
      let dictionary = strongDictionaryCache.current[language];
      if (!dictionary) {
        const response = await fetch(`/original-language/kjv/${language}.json`);
        if (!response.ok) throw new Error("Strong's dictionary unavailable");
        dictionary = await response.json() as StrongDictionary;
        strongDictionaryCache.current[language] = dictionary;
      }

      if (lookupSession !== wordLookupSession.current) return;
      const verseWords = languageBook.verses[`${chapter}:${verseId}`] || [];
      const normalizedSelected = cleaned.toLocaleLowerCase();
      let taggedWord = verseWords[wordOrdinal];
      if (!taggedWord || taggedWord.text.toLocaleLowerCase() !== normalizedSelected) {
        taggedWord = verseWords.filter((candidate) => candidate.text.toLocaleLowerCase() === normalizedSelected)[wordOccurrence];
      }

      const lang = language === "hebrew" ? "he-IL" : "el-GR";
      const entries = (taggedWord?.strongs || []).flatMap((number) => {
        const entry = dictionary?.[number];
        if (!entry) return [];
        return [{
          word: entry.lemma,
          transliteration: entry.transliteration,
          pronunciation: entry.pronunciation,
          spoken: entry.pronunciation || entry.transliteration,
          number,
          meaning: entry.definition || entry.kjv,
          lang,
        } satisfies LexiconEntry];
      });
      setSelectedOriginalEntries(entries);
      setOriginalLookupStatus(entries.length ? "ready" : "unavailable");
    } catch {
      if (lookupSession !== wordLookupSession.current) return;
      setOriginalLookupStatus("error");
    }
  };

  const clearSelectedWord = () => {
    wordLookupSession.current += 1;
    setSelectedWord("");
    setSelectedWordKey("");
    setSelectedOriginalEntries([]);
    setOriginalLookupStatus("idle");
  };

  const pronounceOriginal = (entry: LexiconEntry) => {
    if (!("speechSynthesis" in window)) return;
    stopReading();
    const languagePrefix = entry.lang.split("-")[0].toLowerCase();
    const languageVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
    window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(languageVoice ? entry.word : entry.spoken);
      utterance.lang = languageVoice ? entry.lang : "en-US";
      utterance.rate = languageVoice ? 0.72 : 0.78;
      const fallbackVoice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices);
      if (languageVoice) utterance.voice = languageVoice;
      else if (fallbackVoice) utterance.voice = fallbackVoice;
      window.speechSynthesis.speak(utterance);
      if (readOriginalDefinition && entry.meaning) {
        const definition = new SpeechSynthesisUtterance(entry.meaning);
        definition.lang = "en-US";
        definition.rate = Math.min(rate, 0.92);
        if (fallbackVoice) definition.voice = fallbackVoice;
        window.speechSynthesis.speak(definition);
      }
    }, 90);
  };

  const readOriginalWords = (entries: LexiconEntry[]) => {
    if (!("speechSynthesis" in window)) return;
    stopReading();
    window.setTimeout(() => {
      entries.forEach((entry) => {
        const prefix = entry.lang.split("-")[0].toLowerCase();
        const languageVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
        const utterance = new SpeechSynthesisUtterance(languageVoice ? entry.word : entry.spoken);
        utterance.lang = languageVoice ? entry.lang : "en-US";
        utterance.rate = languageVoice ? 0.72 : 0.78;
        const fallbackVoice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices);
        if (languageVoice) utterance.voice = languageVoice;
        else if (fallbackVoice) utterance.voice = fallbackVoice;
        window.speechSynthesis.speak(utterance);
        if (readOriginalDefinition && entry.meaning) {
          const definition = new SpeechSynthesisUtterance(entry.meaning);
          definition.lang = "en-US";
          definition.rate = Math.min(rate, 0.92);
          if (fallbackVoice) definition.voice = fallbackVoice;
          window.speechSynthesis.speak(definition);
        }
      });
    }, 90);
  };

  const updateNote = (value: string) => {
    const next = { ...notes };
    delete next[activeNoteKey];
    next[activeNoteKey] = value;
    setNotes(next);
    localStorage.setItem("selah-notes-v2", JSON.stringify(next));
  };

  const updateVerseNote = (verseId: number, value: string) => {
    const key = verseKey(verseId);
    const next = { ...notes };
    delete next[key];
    next[key] = value;
    setNotes(next);
    localStorage.setItem("selah-notes-v2", JSON.stringify(next));
  };

  const updateNoteByKey = (key: string, value: string) => {
    const next = { ...notes };
    delete next[key];
    next[key] = value;
    setNotes(next);
    localStorage.setItem("selah-notes-v2", JSON.stringify(next));
  };

  const chooseBook = (book: Book) => {
    setSelectedBook(book);
    setChapter(1);
    setBookFilter("");
    setPicker("chapters");
  };

  const toggleReadingPlace = () => {
    if (isCurrentPlaceBookmarked) {
      localStorage.removeItem("selah-reading-place-v1");
      setBookmark(null);
      return;
    }
    const place = { book: selectedBook.name, chapter };
    localStorage.setItem("selah-reading-place-v1", JSON.stringify(place));
    setBookmark(place);
  };

  const goToAdjacentChapter = (direction: -1 | 1) => {
    const currentBookIndex = books.findIndex((book) => book.name === selectedBook.name);
    if (direction === -1 && chapter > 1) setChapter(chapter - 1);
    else if (direction === 1 && chapter < selectedBook.chapters) setChapter(chapter + 1);
    else {
      const nextBook = books[currentBookIndex + direction];
      if (!nextBook) return;
      setSelectedBook(nextBook);
      setChapter(direction === 1 ? 1 : nextBook.chapters);
    }
  };

  const oldTestament = useMemo(() => books.filter((book) => book.testament === "Old Testament"), []);
  const newTestament = useMemo(() => books.filter((book) => book.testament === "New Testament"), []);
  const filteredOldTestament = useMemo(() => oldTestament.filter((book) => book.name.toLowerCase().includes(bookFilter.trim().toLowerCase())), [bookFilter, oldTestament]);
  const filteredNewTestament = useMemo(() => newTestament.filter((book) => book.name.toLowerCase().includes(bookFilter.trim().toLowerCase())), [bookFilter, newTestament]);
  const davidFallbackVoice = useMemo(() => davidVoice(voices), [voices]);
  const activeCommentaryEntry = useMemo(() => {
    const entries = commentaryData?.entries || [];
    return entries.find((entry) => selectedVerse >= entry.verseStart && selectedVerse <= entry.verseEnd)
      || [...entries].reverse().find((entry) => entry.anchorVerse <= selectedVerse)
      || entries[0];
  }, [commentaryData, selectedVerse]);
  const activeCommentaryEntryIndex = useMemo(() => {
    const entries = commentaryData?.entries || [];
    if (!activeCommentaryEntry) return -1;
    return entries.findIndex((entry) => entry === activeCommentaryEntry);
  }, [activeCommentaryEntry, commentaryData]);

  const commentaryTokens = useMemo(() => activeCommentaryEntry?.text.split(/(\s+)/) || [], [activeCommentaryEntry]);
  const activeCommentaryReferenceLinks = useMemo(
    () => activeCommentaryEntry ? commentaryReferenceLinks(activeCommentaryEntry.text, activeCommentaryEntry.references) : [],
    [activeCommentaryEntry],
  );

  useEffect(() => {
    if (!isReadingCommentary || isCommentaryPaused || commentaryWordIndex === null) return;
    const panel = studyPanelRef.current;
    if (!panel) return;
    const spokenWord = panel.querySelector(".commentary-spoken-word") as HTMLElement | null;
    if (!spokenWord) return;
    const panelRect = panel.getBoundingClientRect();
    const wordRect = spokenWord.getBoundingClientRect();
    const visibleTop = panelRect.top + 96;
    const visibleBottom = panelRect.bottom - 160;
    if (wordRect.top >= visibleTop && wordRect.bottom <= visibleBottom) return;
    const targetTop = panel.scrollTop + (wordRect.top - panelRect.top) - panel.clientHeight * 0.36;
    panel.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }, [commentaryWordIndex, commentaryView, isCommentaryPaused, isReadingCommentary]);

  const clarkeUrl = clarkeCommentaryUrl(selectedBook.name, chapter);
  const commentaryResourceCards = [
    commentaryResourceInfo("expository", selectedBook.name, chapter),
    commentaryResourceInfo("jfb", selectedBook.name, chapter),
    commentaryResourceInfo("clarke", selectedBook.name, chapter),
  ];
  const activeCommentaryResource = commentaryResourceInfo(commentaryResourceView, selectedBook.name, chapter);
  const chapterNotes = verses.filter((verse) => Boolean(notes[verseKey(verse.id)]));
  const selectedSectionIds = [...selectedForHighlight].sort((a, b) => a - b);
  const sectionNoteKey = `${passageKey}-section-${selectedSectionIds.join("_")}`;
  const activeNoteKey = selectedSectionIds.length > 1 ? sectionNoteKey : verseKey(selectedSectionIds[0] || selectedVerse);
  const noteReference = formatNoteReference(selectedBook.name, chapter, selectedSectionIds.length ? selectedSectionIds : [selectedVerse]);
  const sectionNotes = Object.entries(notes)
    .filter(([key, value]) => key.startsWith(`${passageKey}-section-`) && Boolean(value))
    .map(([key, value]) => {
      const verseIds = key.split("-section-")[1].split("_").map(Number);
      return { key, reference: formatNoteReference(selectedBook.name, chapter, verseIds), value };
    });
  const savedNoteVerseIds = new Set<number>([
    ...chapterNotes.map((verse) => verse.id),
    ...sectionNotes.flatMap((note) => note.key.split("-section-")[1].split("_").map(Number)),
  ]);
  const noteValue = notes[activeNoteKey] || "";
  const inlineSectionNoteKey = `${passageKey}-section-${inlineSectionNoteIds.join("_")}`;
  const inlineSectionVerses = verses.filter((verse) => inlineSectionNoteIds.includes(verse.id));
  const isCurrentPlaceBookmarked = bookmark?.book === selectedBook.name && bookmark.chapter === chapter;
  const selectedBookIndex = books.findIndex((book) => book.name === selectedBook.name);
  const hasPreviousChapter = selectedBookIndex > 0 || chapter > 1;
  const hasNextChapter = selectedBookIndex < books.length - 1 || chapter < selectedBook.chapters;
  const recentNotes = Object.entries(notes)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({ saved: parseSavedReference(key), value }))
    .filter((item): item is { saved: SavedReference; value: string } => Boolean(item.saved))
    .reverse();
  const recentHighlights = Object.entries(highlights)
    .map(([key, color]) => ({ saved: parseSavedReference(key), color }))
    .filter((item): item is { saved: SavedReference; color: HighlightColor } => Boolean(item.saved))
    .reverse();
  const savedCount = Object.values(notes).filter(Boolean).length + Object.keys(highlights).length + (bookmark ? 1 : 0);
  const savedReferencesToLoad = useMemo(
    () => [...recentHighlights.map((item) => item.saved), ...recentNotes.map((item) => item.saved)],
    [highlights, notes],
  );
  const readingHistoryGroups = useMemo(() => {
    return readingHistory.reduce((groups, entry) => {
      const label = readingHistoryDateLabel(entry.visitedAt);
      const currentGroup = groups.find((group) => group.label === label);
      if (currentGroup) currentGroup.entries.push(entry);
      else groups.push({ label, entries: [entry] });
      return groups;
    }, [] as { label: string; entries: ReadingHistoryEntry[] }[]);
  }, [readingHistory]);

  const openReadingHistoryEntry = (entry: ReadingHistoryEntry) => {
    const book = books.find((item) => item.name === entry.book);
    if (!book) return;
    setSelectedBook(book);
    setChapter(entry.chapter);
    setReadingHistoryOpen(false);
  };

  const clearReadingHistory = () => {
    setReadingHistory([]);
    localStorage.removeItem(READING_HISTORY_STORAGE_KEY);
  };

  useEffect(() => {
    if (!verses.length) return;
    const cacheKey = savedTextCacheKey(selectedBook.name, chapter);
    setSavedTextCache((current) => ({
      ...current,
      [cacheKey]: Object.fromEntries(verses.map((verse) => [verse.id, verse.text])),
    }));
  }, [selectedBook.name, chapter, verses]);

  useEffect(() => {
    if (!readingHistoryReady || !verses.length || isLoading) return;
    setReadingHistory((current) => {
      const next = nextReadingHistory(current, selectedBook.name, chapter);
      localStorage.setItem(READING_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [selectedBook.name, chapter, isLoading, verses.length, readingHistoryReady]);

  useEffect(() => {
    let ignore = false;
    const uniqueChapters = Array.from(new Map(savedReferencesToLoad.map((saved) => [
      savedTextCacheKey(saved.book.name, saved.chapter),
      saved,
    ])).values()).filter((saved) => !savedTextCache[savedTextCacheKey(saved.book.name, saved.chapter)]);
    if (!uniqueChapters.length) return;

    async function loadSavedChapterText(saved: SavedReference) {
      const cacheKey = savedTextCacheKey(saved.book.name, saved.chapter);
      const chapterVerses = await loadBibleChapter(saved.book.name, saved.chapter);
      return [cacheKey, Object.fromEntries(chapterVerses.map((verse) => [verse.id, verse.text]))] as const;
    }

    Promise.allSettled(uniqueChapters.map(loadSavedChapterText)).then((results) => {
      if (ignore) return;
      const loaded = results
        .filter((result): result is PromiseFulfilledResult<readonly [string, Record<number, string>]> => result.status === "fulfilled")
        .map((result) => result.value);
      if (!loaded.length) return;
      setSavedTextCache((current) => ({ ...current, ...Object.fromEntries(loaded) }));
    });
    return () => { ignore = true; };
  }, [savedReferencesToLoad, savedTextCache, loadBibleChapter]);

  const savedVerseText = (saved: SavedReference) => {
    const chapterText = savedTextCache[savedTextCacheKey(saved.book.name, saved.chapter)] || {};
    return saved.verseIds.map((id) => chapterText[id]).filter(Boolean).join(" ");
  };

  const openSavedReference = (saved: SavedReference) => {
    pendingSavedVerse.current = saved.verseIds[0];
    setSelectedBook(saved.book);
    setChapter(saved.chapter);
    setSavedPanelOpen(false);
    if (saved.book.name === selectedBook.name && saved.chapter === chapter) {
      pendingSavedVerse.current = null;
      setSelectedVerse(saved.verseIds[0]);
      document.getElementById(`verse-${saved.verseIds[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const searchBible = async () => {
    const cleanQuery = searchQuery.trim();
    const normalizedQuery = normalizeSearchText(cleanQuery);
    const rawQueryWords = searchTerms(cleanQuery);
    const significantQueryWords = rawQueryWords.filter((word) => word.length > 1 && !searchStopWords.has(word));
    const queryWords = significantQueryWords.length ? significantQueryWords : rawQueryWords.filter((word) => word.length > 1);
    if (!queryWords.length) {
      setSearchResults([]);
      setSearchStatus("idle");
      setSearchPanelOpen(false);
      return;
    }

    stopReading();
    setPicker(null);
    setSavedPanelOpen(false);
    setAudioSettingsOpen(false);
    setSearchPanelOpen(true);
    setSearchStatus("searching");

    try {
      const loadedBooks = await Promise.all(books.map(async (book) => ({ book, source: await loadBibleBook(book.name) })));
      const matches: BibleSearchResult[] = [];
      const suggestions: BibleSearchResult[] = [];
      const suggestionThreshold = queryWords.length > 2 ? Math.ceil(queryWords.length * 0.6) : 2;
      for (const { book, source } of loadedBooks) {
        source.chapters.forEach((sourceChapter) => {
          const chapterNumber = Number(sourceChapter.chapter);
          sourceChapter.verses.forEach((verse) => {
            const normalizedVerse = normalizeSearchText(verse.text);
            const verseWords = new Set(searchTerms(verse.text));
            const exactPhrase = normalizedVerse.includes(normalizedQuery);
            const allWords = queryWords.every((word) => verseWords.has(word));
            const matchedWordCount = queryWords.filter((word) => verseWords.has(word)).length;
            const baseResult = {
              book,
              chapter: chapterNumber,
              verse: Number(verse.verse),
              reference: `${book.name} ${chapterNumber}:${verse.verse}`,
              text: verse.text.trim(),
            };
            if (exactPhrase || allWords) {
              matches.push({
                ...baseResult,
                kind: "match",
                rank: exactPhrase ? 0 : Math.max(1, 20 - matchedWordCount),
              });
              return;
            }
            if (queryWords.length > 1 && matchedWordCount >= suggestionThreshold) {
              suggestions.push({
                ...baseResult,
                kind: "suggestion",
                rank: 100 + Math.max(1, 20 - matchedWordCount),
              });
            }
          });
        });
      }
      const sortResults = (a: BibleSearchResult, b: BibleSearchResult) => a.rank - b.rank || books.indexOf(a.book) - books.indexOf(b.book) || a.chapter - b.chapter || a.verse - b.verse;
      const primaryMatches = matches.sort(sortResults).slice(0, 120);
      const relatedSuggestions = suggestions.sort(sortResults).slice(0, primaryMatches.length ? 12 : 30);
      setSearchResults([...primaryMatches, ...relatedSuggestions]);
      setSearchStatus("ready");
    } catch {
      setSearchStatus("error");
    }
  };

  const openSearchResult = (result: BibleSearchResult) => {
    pendingSavedVerse.current = result.verse;
    setSelectedBook(result.book);
    setChapter(result.chapter);
    setSearchPanelOpen(false);
    if (result.book.name === selectedBook.name && result.chapter === chapter) {
      pendingSavedVerse.current = null;
      setSelectedVerse(result.verse);
      document.getElementById(`verse-${result.verse}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const renderSearchVerseText = (result: BibleSearchResult) => {
    const highlightTerms = new Set(searchHighlightTerms(searchQuery));
    const redLetterText = redLetterMap[result.reference]?.trim() || "";
    const redStart = redLetterText ? result.text.indexOf(redLetterText) : -1;
    const redEnd = redStart >= 0 ? redStart + redLetterText.length : -1;
    let offset = 0;

    return result.text.split(/(\s+)/).map((token, index) => {
      const start = offset;
      offset += token.length;
      if (/^\s+$/.test(token)) return token;
      const normalizedToken = normalizeSearchText(token);
      const isHighlighted = normalizedToken.length > 1 && highlightTerms.has(normalizedToken);
      const isRedLetter = redStart >= 0 && start >= redStart && start < redEnd;
      const className = isRedLetter ? "search-red-letter" : undefined;
      if (isHighlighted) return <mark key={`${result.reference}-${index}`} className={className}>{token}</mark>;
      return <span key={`${result.reference}-${index}`} className={className}>{token}</span>;
    });
  };

  const openBookmarkedChapter = () => {
    if (!bookmark) return;
    const book = books.find((item) => item.name === bookmark.book);
    if (!book) return;
    pendingSavedVerse.current = 1;
    setSelectedBook(book);
    setChapter(bookmark.chapter);
    setSavedPanelOpen(false);
  };
  const readSavedReference = (saved: SavedReference) => {
    const text = savedVerseText(saved);
    if (!text || !("speechSynthesis" in window)) return;
    const readKey = `saved:${saved.key}`;
    if (activeSnippetReadKey === readKey && isReading) {
      togglePause();
      return;
    }
    stopReading();
    const utterance = new SpeechSynthesisUtterance(`${saved.reference}. ${text}`);
    utterance.rate = rate;
    utterance.voice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices) || null;
    utterance.onend = () => {
      setIsReading(false);
      setIsPaused(false);
      setActiveSnippetReadKey("");
    };
    utterance.onerror = () => {
      setIsReading(false);
      setIsPaused(false);
      setActiveSnippetReadKey("");
    };
    setActiveSnippetReadKey(readKey);
    setIsReading(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const readSearchResult = (result: BibleSearchResult) => {
    if (!result.text || !("speechSynthesis" in window)) return;
    const readKey = `search:${result.reference}`;
    if (activeSnippetReadKey === readKey && isReading) {
      togglePause();
      return;
    }
    stopReading();
    const utterance = new SpeechSynthesisUtterance(`${result.reference}. ${result.text}`);
    utterance.rate = rate;
    utterance.voice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices) || null;
    utterance.onend = () => {
      setIsReading(false);
      setIsPaused(false);
      setActiveSnippetReadKey("");
    };
    utterance.onerror = () => {
      setIsReading(false);
      setIsPaused(false);
      setActiveSnippetReadKey("");
    };
    setActiveSnippetReadKey(readKey);
    setIsReading(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const openCommentaryReference = (reference: CommentaryReference) => {
    const passage = parsePassageReference(reference.osis) || parsePassageReference(reference.label);
    if (!passage) return;
    const previous = { book: selectedBook, chapter, verse: selectedVerse };
    setCommentaryReferenceTab({ reference, passage, previous });
    if (samePassage(previous, passage)) return;
    pendingSavedVerse.current = passage.verse;
    setSelectedBook(passage.book);
    setChapter(passage.chapter);
    setSelectedVerse(passage.verse);
    window.history.pushState({}, "", passageHref(passage.book, passage.chapter, passage.verse));
    if (passage.book.name === selectedBook.name && passage.chapter === chapter) {
      pendingSavedVerse.current = null;
      window.setTimeout(() => {
        document.getElementById(`verse-${passage.verse}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  };

  const closeCommentaryReference = () => {
    if (!commentaryReferenceTab) return;
    const previous = commentaryReferenceTab.previous;
    const isSameChapter = previous.book.name === selectedBook.name && previous.chapter === chapter;
    setCommentaryReferenceTab(null);
    pendingSavedVerse.current = previous.verse;
    setSelectedBook(previous.book);
    setChapter(previous.chapter);
    setSelectedVerse(previous.verse);
    window.history.replaceState({}, "", passageHref(previous.book, previous.chapter, previous.verse));
    if (isSameChapter) {
      window.setTimeout(() => {
        document.getElementById(`verse-${previous.verse}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  };

  const openCommentaryResourceModal = (view: CommentaryView = commentaryView) => {
    setCommentaryResourceView(view);
    setCommentaryResourceOpen(true);
  };

  const closeCommentaryResourceModal = () => setCommentaryResourceOpen(false);

  const turnCommentarySection = (direction: -1 | 1) => {
    const entries = commentaryData?.entries || [];
    const nextEntry = entries[activeCommentaryEntryIndex + direction];
    if (!nextEntry) return;
    if (isReadingCommentary) stopReading();
    setCommentaryWordIndex(null);
    setSelectedVerse(nextEntry.verseStart);
  };

  const toggleCommentaryReading = () => {
    if (!activeCommentaryEntry || !("speechSynthesis" in window)) return;
    if (isReadingCommentary) {
      if (isCommentaryPaused) {
        window.speechSynthesis.resume();
        setIsCommentaryPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsCommentaryPaused(true);
      }
      return;
    }

    stopReading();
    const spokenPrefix = `${selectedBook.name} ${chapter}. ${activeCommentaryEntry.heading}. `;
    const spokenText = `${spokenPrefix}${activeCommentaryEntry.text}`;
    const wordRanges: { index: number; start: number; end: number }[] = [];
    let characterOffset = spokenPrefix.length;
    commentaryTokens.forEach((token, index) => {
      if (!/^\s+$/.test(token)) wordRanges.push({ index, start: characterOffset, end: characterOffset + token.length });
      characterOffset += token.length;
    });
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = rate;
    utterance.voice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices) || null;
    utterance.onboundary = (event) => {
      if (event.name && event.name !== "word") return;
      const range = wordRanges.find((item) => event.charIndex >= item.start && event.charIndex < item.end);
      if (range) setCommentaryWordIndex(range.index);
    };
    utterance.onend = () => {
      setIsReadingCommentary(false);
      setIsCommentaryPaused(false);
      setCommentaryWordIndex(null);
    };
    utterance.onerror = () => {
      setIsReadingCommentary(false);
      setIsCommentaryPaused(false);
      setCommentaryWordIndex(null);
    };
    setIsReadingCommentary(true);
    setIsCommentaryPaused(false);
    setCommentaryWordIndex(commentaryTokens.findIndex((token) => !/^\s+$/.test(token)));
    window.speechSynthesis.speak(utterance);
  };

  const renderCommentaryText = () => {
    const rendered: ReactNode[] = [];
    let offset = 0;
    let activeLink: CommentaryReferenceLink | null = null;
    let activeLinkNodes: ReactNode[] = [];

    const flushLink = () => {
      if (!activeLink) return;
      const reference = activeLink.reference;
      const href = activeLink.href;
      const label = activeLink.label;
      rendered.push(
        <a
          href={href}
          key={`commentary-reference-${activeLink.start}-${href}`}
          className="commentary-passage-link"
          aria-label={`Open ${label} in this page`}
        >
          {activeLinkNodes}
        </a>,
      );
      activeLink = null;
      activeLinkNodes = [];
    };

    commentaryTokens.forEach((token, index) => {
      const tokenStart = offset;
      offset += token.length;
      const tokenEnd = offset;
      const link = activeCommentaryReferenceLinks.find((reference) => tokenStart >= reference.start && tokenEnd <= reference.end) || null;
      const node = /^\s+$/.test(token)
        ? token
        : <span key={`${token}-${index}`} className={commentaryWordIndex === index ? "commentary-spoken-word" : ""}>{token}</span>;

      if (link) {
        if (activeLink?.href !== link.href || activeLink.start !== link.start) flushLink();
        activeLink = link;
        activeLinkNodes.push(node);
        return;
      }

      flushLink();
      rendered.push(node);
    });

    flushLink();
    return rendered;
  };

  const startStudyResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (studyCollapsed || window.innerWidth <= 820) return;
    event.preventDefault();
    studyResizeStart.current = { x: event.clientX, width: studyPanelWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingStudy(true);
  };

  const workspaceStyle = studyCollapsed ? undefined : ({ "--study-panel-width": `${studyPanelWidth}px` } as CSSProperties);

  return (
    <main className="app-shell" style={workspaceStyle}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-copy">
            <div className="brand-title-row">
              <strong>Selah</strong>
              {showDevBadge && <span className="environment-badge">DEV</span>}
            </div>
            <span>Scripture, slowly</span>
          </div>
        </div>

        <div className="passage-picker" ref={passagePickerRef} aria-label="Choose a Bible passage">
          <button className="book-button" onClick={() => setPicker(picker === "books" ? null : "books")} aria-expanded={picker === "books"}>
            {selectedBook.name}
          </button>
          <div className="divider" />
          <button className="chapter-button" onClick={() => setPicker(picker === "chapters" ? null : "chapters")} aria-expanded={picker === "chapters"}>
            Chapter {chapter}
          </button>
          <form className={`bible-search-control ${searchExpanded ? "expanded" : ""}`} onSubmit={(event) => { event.preventDefault(); void searchBible(); }}>
            {searchExpanded ? (
              <>
                <label className="sr-only" htmlFor="bible-search-input">Search the Bible</label>
                <input
                  id="bible-search-input"
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search Bible..."
                />
                <button type="button" aria-label="Close Bible search" title="Close search" onClick={() => setSearchExpanded(false)}><span className="search-glyph" aria-hidden="true" /></button>
              </>
            ) : (
              <button type="button" onClick={() => { setPicker(null); setSearchExpanded(true); }} aria-label="Open Bible search" title="Search Bible"><span className="search-glyph" aria-hidden="true" /></button>
            )}
          </form>
          {picker === "chapters" && (
            <>
              <button className="picker-backdrop" onClick={() => setPicker(null)} aria-label="Close chapter picker" />
              <section className="chapter-dropdown" aria-label={`Chapters in ${selectedBook.name}`}>
              <div className="chapter-dropdown-heading">
                <div><strong>Choose a chapter</strong><span>{selectedBook.name}</span></div>
                <button className="ui-close-button" onClick={() => setPicker(null)} aria-label="Close chapter menu">×</button>
              </div>
              <div className="chapter-grid">
                {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((number) => (
                  <button key={number} className={number === chapter ? "selected" : ""} onClick={() => { setChapter(number); setPicker(null); }}>{number}</button>
                ))}
              </div>
              </section>
            </>
          )}
        </div>

        <div className="header-actions" ref={savedPanelRef}>
          <span className="translation-badge">KJV</span>
          <button className="settings-cog-button" onClick={() => { setSavedPanelOpen(false); setAudioSettingsOpen(true); }} aria-expanded={audioSettingsOpen} aria-label="Open app settings" title="Settings">
            <span aria-hidden="true">&#9881;</span>
          </button>
          <button className="saved-library-button" onClick={() => { setAudioSettingsOpen(false); setSavedPanelOpen((current) => !current); }} aria-expanded={savedPanelOpen} aria-label="Open saved highlights, notes, and reading place">
            <span aria-hidden="true">⌑</span> Saved {savedCount > 0 && <small>{savedCount}</small>}
          </button>
        </div>
      </header>

      {audioSettingsOpen && (
        <section className="settings-window" aria-modal="true" role="dialog" aria-label="App settings">
          <div className="settings-window-heading">
            <div><span>SETTINGS</span><strong>Reading preferences</strong></div>
            <button className="ui-close-button" onClick={() => setAudioSettingsOpen(false)} aria-label="Close settings">×</button>
          </div>
          <div className="settings-window-body">
            <div className="settings-card">
              <div className="settings-card-heading">
                <span>AUDIO</span>
                <strong>Read aloud source</strong>
              </div>
              <label>
                <span>Source</span>
                <select value={audioSourcePreference} onChange={(event) => {
                  const nextSource = event.target.value as AudioSourcePreference;
                  setAudioSourcePreference(nextSource);
                  localStorage.setItem("selah-audio-source", nextSource);
                }}>
                  <option value="auto">Automatic - David only for now</option>
                  <option value="official" disabled>Official audio Bible — disabled right now</option>
                  <option value="david">Microsoft David</option>
                </select>
              </label>
              <div className="audio-source-summary">
                <span>Primary</span>
                <strong>{shouldUseChapterMp3Audio ? "Official audio Bible" : audioSourcePreference === "david" ? "Microsoft David selected" : "Official audio Bible is disabled right now"}</strong>
                <p>{shouldUseChapterMp3Audio ? "Selah will play the imported KJV chapter MP3 for this chapter." : audioSourcePreference === "david" ? "Selah will use David for read aloud." : "The official chapter recordings are kept local for now and are not active in the app."}</p>
              </div>
              <div className="audio-source-summary">
                <span>Fallback</span>
                <strong>{davidFallbackVoice ? davidFallbackVoice.name : "Microsoft David"}</strong>
                <p>All browser-generated read aloud is limited to David. Other installed or cloud voices are no longer shown.</p>
              </div>
              <label className="settings-toggle">
                <span>Dock</span>
                <input type="checkbox" checked={audioDockEnabled} onChange={(event) => {
                  const enabled = event.target.checked;
                  setAudioDockEnabled(enabled);
                  localStorage.setItem("selah-audio-dock-enabled", String(enabled));
                  if (enabled) setAudioDockCollapsed(false);
                }} />
                <i aria-hidden="true" />
              </label>
              <p className="settings-help">Turn this off to hide the read aloud dock at the bottom of the page.</p>
              <label className="speed-control">
                <span>Speed</span>
                <input
                  type="range"
                  min={READ_ALOUD_RATE_OPTIONS[0]}
                  max={READ_ALOUD_RATE_OPTIONS[READ_ALOUD_RATE_OPTIONS.length - 1]}
                  step="0.1"
                  list="read-aloud-speed-ticks"
                  value={rate}
                  onChange={(event) => setRate(closestReadAloudRate(Number(event.target.value)))}
                />
                <datalist id="read-aloud-speed-ticks">
                  {READ_ALOUD_RATE_OPTIONS.map((speed) => <option key={speed} value={speed} />)}
                </datalist>
                <div className="speed-ticks" aria-hidden="true">
                  {READ_ALOUD_RATE_OPTIONS.map((speed) => <i key={speed} className={speed === rate ? "active" : ""} />)}
                </div>
                <strong>{rate.toFixed(2)}x</strong>
                <button type="button" onClick={() => setRate(DEFAULT_READ_ALOUD_RATE)}>Default</button>
              </label>
              <div className="highlight-meaning-section">
                <div className="settings-card-heading settings-card-heading-mini">
                  <span>ORGANIZATION</span>
                  <button
                    type="button"
                    className="settings-card-heading-toggle"
                    onClick={() => {
                      const next = !highlightMeaningSectionOpen;
                      setHighlightMeaningSectionOpen(next);
                      localStorage.setItem("selah-highlight-meaning-section-open", String(next));
                    }}
                    aria-expanded={highlightMeaningSectionOpen}
                    aria-label={highlightMeaningSectionOpen ? "Collapse highlight meanings" : "Expand highlight meanings"}
                  >
                    <strong>Highlight meanings</strong>
                    <span>{highlightMeaningSectionOpen ? "−" : "+"}</span>
                  </button>
                </div>
                {highlightMeaningSectionOpen && (
                  <>
                    <div className="highlight-meaning-editor">
                      <div className="highlight-meaning-palette" role="tablist" aria-label="Highlight colors">
                        {(Object.keys(highlightColorNames) as HighlightColor[]).map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-swatch ${color} ${highlightMeaningColor === color ? "selected" : ""}`}
                            style={{ "--swatch-color": highlightSwatchColors[color] } as CSSProperties}
                            onClick={() => setHighlightMeaningColor(color)}
                            aria-pressed={highlightMeaningColor === color}
                            aria-label={highlightMeaningLabel(color, highlightMeanings)}
                            title={highlightMeaningLabel(color, highlightMeanings)}
                          >
                            <span className="swatch-chip" style={{ backgroundColor: highlightSwatchColors[color] }} />
                          </button>
                        ))}
                      </div>
                      <label className="highlight-meaning-input">
                        <span>Tag</span>
                        <input
                          type="text"
                          value={highlightMeanings[highlightMeaningColor] || ""}
                          onChange={(event) => updateHighlightMeaning(highlightMeaningColor, event.target.value)}
                          placeholder="Example: favorite verse, promise, warning"
                          aria-label={`${highlightColorNames[highlightMeaningColor]} highlight meaning`}
                        />
                      </label>
                    </div>
                    <div className="highlight-meaning-actions">
                      <p>Give each color a meaning you’ll remember later. Those labels will also show as tooltips on the highlight buttons.</p>
                      <button type="button" className="secondary" onClick={resetHighlightMeanings}>Reset meanings</button>
                    </div>
                    <div className="highlight-meaning-summary">
                      {(Object.keys(highlightColorNames) as HighlightColor[]).map((color) => (
                        <div key={color} className={`highlight-meaning-summary-item ${color}`}>
                          <span className="swatch-chip" style={{ backgroundColor: highlightSwatchColors[color] }} />
                          <div>
                            <strong>{highlightColorNames[color]}</strong>
                            <p>{highlightMeanings[color]?.trim() || "No meaning set yet"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="settings-side-stack">
              <div className="settings-card">
                <div className="settings-card-heading">
                  <span>APPEARANCE</span>
                  <strong>Page theme</strong>
                </div>
                <label>
                  <span>Theme</span>
                    <select value={themePreference} onChange={(event) => {
                      const nextTheme = event.target.value as ThemePreference;
                      setThemePreference(nextTheme);
                      localStorage.setItem("selah-theme", nextTheme);
                    }}>
                      <option value="system">Follow device</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="green-dark">Green dark</option>
                      <option value="true-dark">True dark</option>
                    </select>
                  </label>
              </div>
              <div className="settings-card">
                <div className="settings-card-heading">
                  <span>ORIGINAL LANGUAGE</span>
                  <strong>Pronunciation</strong>
                </div>
                <label className="settings-toggle">
                  <span>Definition</span>
                  <input type="checkbox" checked={readOriginalDefinition} onChange={(event) => {
                    const enabled = event.target.checked;
                    setReadOriginalDefinition(enabled);
                    localStorage.setItem("selah-read-original-definition", String(enabled));
                  }} />
                  <i aria-hidden="true" />
                </label>
                <p className="settings-help">When enabled, Selah reads the English definition immediately after pronouncing the Hebrew or Greek word.</p>
              </div>
              <div className="settings-card settings-card-version">
                <div className="settings-card-heading settings-card-heading-action">
                  <div>
                    <span>APP UPDATES</span>
                    <strong>Version {APP_VERSION}</strong>
                  </div>
                  <button type="button" onClick={openVersionHistory} aria-label="Open version history">History</button>
                </div>
                <div className="settings-action-row">
                  <button onClick={checkForAppUpdate} disabled={updateStatus === "checking" || updateStatus === "updating"}>{updateStatus === "checking" ? "Checking..." : "Check for update"}</button>
                  {updateStatus === "available" && <button className="primary" onClick={() => void applyAppUpdate()}>Update now</button>}
                  {updateStatus === "updating" && <button className="primary" disabled>Updating...</button>}
                  <span className={`update-inline-message ${updateStatus}`}>{updateMessage}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {savedPanelOpen && (
        <section className="saved-library saved-library-window" aria-modal="true" role="dialog" aria-label="Saved highlights and notes">
          <div className="saved-library-heading">
            <div><span>YOUR LIBRARY</span><strong>Saved</strong></div>
            <button className="ui-close-button" onClick={() => setSavedPanelOpen(false)} aria-label="Close saved section">×</button>
          </div>
          <div className="saved-library-body">
            <div className="saved-bookmark-card">
              <i className="saved-bookmark-icon" aria-hidden="true" />
              <div>
                <span>BOOKMARK</span>
                <strong>{bookmark ? `${bookmark.book} ${bookmark.chapter}` : "No chapter bookmarked"}</strong>
                <small>{bookmark ? "Your saved reading place" : "Tap the bookmark beside a book name to save your place."}</small>
              </div>
              {bookmark && <button onClick={openBookmarkedChapter}>Jump to chapter</button>}
            </div>
            <div className="saved-section">
              <div className="saved-section-top">
                <div>
                  <span>SAVED SECTION</span>
                  <strong>{savedViewTab === "highlights" ? "Highlights" : "Notes"}</strong>
                </div>
                <div className="saved-tabs" role="tablist" aria-label="Saved library sections">
                  <button className={savedViewTab === "highlights" ? "active" : ""} onClick={() => setSavedViewTab("highlights")} role="tab" aria-selected={savedViewTab === "highlights"} aria-label="Highlights · newest first">Highlights</button>
                  <button className={savedViewTab === "notes" ? "active" : ""} onClick={() => setSavedViewTab("notes")} role="tab" aria-selected={savedViewTab === "notes"}>Notes</button>
                </div>
              </div>
              {savedViewTab === "highlights" ? (
                <div className="saved-list">
                  {recentHighlights.length ? recentHighlights.map(({ saved, color }) => {
                    const text = savedVerseText(saved);
                    const isSavedReading = activeSnippetReadKey === `saved:${saved.key}` && isReading;
                    return (
                      <div className="saved-list-item" key={saved.key}>
                        <button className="saved-jump" onClick={() => openSavedReference(saved)}>
                          <i className={`saved-color ${color}`} aria-hidden="true" />
                          <span><strong>{saved.reference}</strong><small>{text ? excerptText(text) : "Loading verse text..."}</small></span>
                          <b>Jump</b>
                        </button>
                        <button className="saved-read-aloud icon-read-aloud" onClick={() => readSavedReference(saved)} disabled={!text} aria-label={isSavedReading && !isPaused ? `Pause reading ${saved.reference}` : isSavedReading && isPaused ? `Resume reading ${saved.reference}` : `Read ${saved.reference} aloud`} title={isSavedReading && !isPaused ? "Pause read aloud" : isSavedReading && isPaused ? "Resume read aloud" : "Read aloud"}>
                          {isSavedReading && !isPaused ? <span className="pause-read-aloud" aria-hidden="true">Ⅱ</span> : <span className="play-read-aloud" aria-hidden="true">▶</span>}
                        </button>
                      </div>
                    );
                  }) : <p>No saved highlights yet.</p>}
                </div>
              ) : (
                <div className="saved-list">
                  {recentNotes.length ? recentNotes.map(({ saved, value }) => {
                    const text = savedVerseText(saved);
                    const isSavedReading = activeSnippetReadKey === `saved:${saved.key}` && isReading;
                    return (
                      <div className="saved-list-item" key={saved.key}>
                        <button className="saved-jump" onClick={() => openSavedReference(saved)}>
                          <i className="saved-pencil" aria-hidden="true">✎</i>
                          <span><strong>{saved.reference}</strong><small>{value}</small></span>
                          <b>Jump</b>
                        </button>
                        <button className="saved-read-aloud icon-read-aloud" onClick={() => readSavedReference(saved)} disabled={!text} aria-label={isSavedReading && !isPaused ? `Pause reading ${saved.reference}` : isSavedReading && isPaused ? `Resume reading ${saved.reference}` : `Read ${saved.reference} aloud`} title={isSavedReading && !isPaused ? "Pause read aloud" : isSavedReading && isPaused ? "Resume read aloud" : "Read aloud"}>
                          {isSavedReading && !isPaused ? <span className="pause-read-aloud" aria-hidden="true">Ⅱ</span> : <span className="play-read-aloud" aria-hidden="true">▶</span>}
                        </button>
                      </div>
                    );
                  }) : <p>No saved notes yet.</p>}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {readingHistoryOpen && (
        <section className="saved-library saved-library-window reading-history-window" aria-modal="true" role="dialog" aria-label="Reading history">
          <div className="saved-library-heading reading-history-window-heading">
            <div><span>YOUR LIBRARY</span><strong>Reading History</strong></div>
            <button className="ui-close-button" onClick={() => setReadingHistoryOpen(false)} aria-label="Close reading history">×</button>
          </div>
          <div className="saved-library-body">
            <div className="saved-section reading-history">
              <div className="saved-section-top">
                <div>
                  <span>RECENT CHAPTERS</span>
                  <strong>
                    {readingHistory.length ? "Recently opened" : "Nothing read yet"}
                    <span
                      className="reading-history-limit-tip"
                      title="A maximum of 50 entries is kept."
                      aria-label="A maximum of 50 entries is kept."
                    >
                      i
                    </span>
                  </strong>
                </div>
                {readingHistory.length > 0 && <button className="clear-history-button" onClick={clearReadingHistory}>Clear</button>}
              </div>
              {readingHistoryGroups.length ? (
                <div className="reading-history-list">
                  {readingHistoryGroups.map((group) => (
                    <section className="reading-history-group" key={group.label}>
                      <h3>{group.label}</h3>
                      {group.entries.map((entry) => (
                        <button key={`${entry.book}-${entry.chapter}-${entry.visitedAt}`} onClick={() => openReadingHistoryEntry(entry)}>
                          <span><strong>{entry.book} {entry.chapter}</strong></span>
                        </button>
                      ))}
                    </section>
                  ))}
                </div>
              ) : <p className="reading-history-empty">Chapters you open will appear here.</p>}
            </div>
          </div>
        </section>
      )}

      {searchPanelOpen && (
        <section className="search-library" aria-modal="true" role="dialog" aria-label="Bible search results">
          <div className="search-library-heading">
            <div><span>BIBLE SEARCH</span><strong>Search Results</strong></div>
            <button className="ui-close-button" onClick={() => setSearchPanelOpen(false)} aria-label="Close Bible search">×</button>
          </div>
          <div className="search-library-body">
            <form className="search-library-box" onSubmit={(event) => { event.preventDefault(); void searchBible(); }}>
              <label className="sr-only" htmlFor="bible-search-window-input">Search Bible keywords</label>
              <input
                id="bible-search-window-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search words or a phrase..."
              />
              <button type="submit" disabled={searchStatus === "searching"}>{searchStatus === "searching" ? "Searching" : "Search"}</button>
            </form>
            <div className="search-results-summary">
              {searchStatus === "searching" && "Searching the local Bible text..."}
              {searchStatus === "ready" && (() => {
                const matchCount = searchResults.filter((result) => result.kind === "match").length;
                const suggestionCount = searchResults.filter((result) => result.kind === "suggestion").length;
                if (suggestionCount) return `${matchCount} likely ${matchCount === 1 ? "match" : "matches"} + ${suggestionCount} related ${suggestionCount === 1 ? "suggestion" : "suggestions"}`;
                return `${matchCount} ${matchCount === 1 ? "verse" : "verses"} found`;
              })()}
              {searchStatus === "error" && "Search is unavailable right now."}
            </div>
            <div className="search-results-list">
              {searchStatus === "ready" && searchResults.length === 0 && <p>No verses found. Try a shorter word or phrase.</p>}
              {searchResults.map((result) => {
                const isSearchReading = activeSnippetReadKey === `search:${result.reference}` && isReading;
                return (
                <div
                  key={`${result.reference}-${result.rank}-${result.kind}`}
                  className={`search-result-card ${result.kind === "suggestion" ? "search-suggestion" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSearchResult(result)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openSearchResult(result); }}
                >
                  <div className="search-result-copy">
                    <strong>{result.reference}</strong>
                    <span className="search-result-text">
                      {renderSearchVerseText(result)}
                      {result.kind === "suggestion" && <em>Related suggestion</em>}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="search-read-aloud"
                    onClick={(event) => { event.stopPropagation(); void readSearchResult(result); }}
                    aria-label={isSearchReading && !isPaused ? `Pause reading ${result.reference}` : isSearchReading && isPaused ? `Resume reading ${result.reference}` : `Read ${result.reference} aloud`}
                    title={isSearchReading && !isPaused ? "Pause read aloud" : isSearchReading && isPaused ? "Resume read aloud" : "Read aloud"}
                  >
                    {isSearchReading && !isPaused ? <span className="pause-read-aloud" aria-hidden="true">Ⅱ</span> : <span className="play-read-aloud" aria-hidden="true">▶</span>}
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {versionHistoryOpen && (
        <section className="release-notes-modal" aria-modal="true" role="dialog" aria-label="Selah version history" onClick={() => setVersionHistoryOpen(false)}>
          <section className="release-notes-window version-history-window" onClick={(event) => event.stopPropagation()}>
            <div className="release-notes-heading">
              <div>
                <span>VERSION HISTORY</span>
                <strong>Update board</strong>
                <small>Showing the release notes Selah uses for update popups.</small>
              </div>
              <button className="ui-close-button" onClick={() => setVersionHistoryOpen(false)} aria-label="Close version history">×</button>
            </div>
            <div className="release-notes-body">
              {versionHistoryNotes.map((release) => (
                <article className="release-note-card" key={release.version}>
                  <div>
                    <span>{release.releasedAt || "Release"}</span>
                    <strong>{release.title || `Version ${release.version}`}</strong>
                    <small>Version {release.version}</small>
                  </div>
                  <ul>
                    {(release.changes || []).map((change) => <li key={change}>{change}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <button className="release-notes-done" onClick={() => setVersionHistoryOpen(false)}>Close history</button>
          </section>
        </section>
      )}

      {releaseNotesModal && (
        <section className="release-notes-modal" aria-modal="true" role="dialog" aria-label="Selah update notes" onClick={() => setReleaseNotesModal(null)}>
          <section className="release-notes-window" onClick={(event) => event.stopPropagation()}>
            <div className="release-notes-heading">
              <div>
                <span>SELAH UPDATED</span>
                <strong>Version {releaseNotesModal.toVersion}</strong>
                <small>Updated from {releaseNotesModal.fromVersion}</small>
              </div>
              <button className="ui-close-button" onClick={() => setReleaseNotesModal(null)} aria-label="Close update notes">×</button>
            </div>
            <div className="release-notes-body">
              {releaseNotesModal.releases.map((release) => (
                <article className="release-note-card" key={release.version}>
                  <div>
                    <span>{release.releasedAt || "Latest release"}</span>
                    <strong>{release.title || `Version ${release.version}`}</strong>
                    <small>Version {release.version}</small>
                  </div>
                  <ul>
                    {(release.changes || []).map((change) => <li key={change}>{change}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <button className="release-notes-done" onClick={() => setReleaseNotesModal(null)}>Continue reading</button>
          </section>
        </section>
      )}

      {commentaryResourceOpen && (
        <section className="commentary-resource-modal" aria-modal="true" role="dialog" aria-label="Commentary resource details" onClick={closeCommentaryResourceModal}>
          <section className="commentary-resource-window" onClick={(event) => event.stopPropagation()}>
            <div className="commentary-resource-heading">
              <div>
                <span>COMMENTARY RESOURCES</span>
                <strong>What each source is good for</strong>
              </div>
              <button className="ui-close-button" onClick={closeCommentaryResourceModal} aria-label="Close commentary resource details">×</button>
            </div>
            <p className="commentary-resource-intro">
              These are the three study layers in Selah. Each one is public-domain or externally linked, and each serves a slightly different kind of reading.
            </p>
            <div className="commentary-resource-grid">
              {commentaryResourceCards.map((resource) => (
                <article key={resource.view} className={`commentary-resource-card ${resource.view === commentaryResourceView ? "active" : ""}`}>
                  <div className="commentary-resource-card-top">
                    <div>
                      <span>{resource.tag}</span>
                      <strong>{resource.title}</strong>
                    </div>
                    {resource.view === commentaryResourceView && <b>Current</b>}
                  </div>
                  <p>{resource.summary}</p>
                  <dl>
                    <div>
                      <dt>Written by</dt>
                      <dd>{resource.author}</dd>
                    </div>
                    <div>
                      <dt>Where to find it</dt>
                      <dd>{resource.source}</dd>
                    </div>
                    <div>
                      <dt>Best for</dt>
                      <dd>{resource.bestFor}</dd>
                    </div>
                  </dl>
                  <div className="commentary-resource-footer">
                    <small>{resource.where}</small>
                    <a href={resource.linkUrl(selectedBook.name, chapter)} target="_blank" rel="noreferrer">{resource.linkLabel} ↗</a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {picker === "books" && (
        <>
          <button className="picker-backdrop" onClick={() => setPicker(null)} aria-label="Close passage picker" />
          <section className="passage-menu book-menu" aria-label="Books of the Bible">
                <div className="passage-menu-heading">
                  <div><span>BIBLE</span><h2>Choose a book</h2></div>
                  <button className="ui-close-button" onClick={() => setPicker(null)} aria-label="Close">×</button>
                </div>
                <label className="book-search">
                  <span className="sr-only">Filter Bible books</span>
                  <b aria-hidden="true">⌕</b>
                  <input autoFocus value={bookFilter} onChange={(event) => setBookFilter(event.target.value)} placeholder="Search for a book…" />
                </label>
                <button className="book-menu-history-button" type="button" onClick={() => { setPicker(null); setSearchExpanded(false); setReadingHistoryOpen(true); }}>
                  <span aria-hidden="true">↺</span>
                  <strong>Reading History</strong>
                </button>
                <div className="testament-columns">
                  {[{ title: "Old Testament", items: filteredOldTestament }, { title: "New Testament", items: filteredNewTestament }].map((group) => (
                    <div key={group.title} className="testament-group">
                      <h3>{group.title}</h3>
                      <div className="book-grid">
                        {group.items.map((book) => <button key={book.name} className={book.name === selectedBook.name ? "selected" : ""} onClick={() => chooseBook(book)}>{book.name}</button>)}
                        {group.items.length === 0 && <p className="no-books">No matching books</p>}
                      </div>
                    </div>
                  ))}
                </div>
          </section>
        </>
      )}

      <div className={`workspace ${studyCollapsed ? "study-collapsed" : ""} ${isResizingStudy ? "resizing-study" : ""}`}>
        <article
          className="reader"
          onClickCapture={(event) => {
            if (!wordStudyMode || !selectedWordKey) return;
            const target = event.target as HTMLElement;
            if (target.closest(".verse-word, button, a, input, textarea, select")) return;
            clearSelectedWord();
          }}
        >
          {commentaryReferenceTab && (
            <div className="commentary-reference-tab reader-reference-tab">
              <div>
                <span>REFERENCE PASSAGE</span>
                <strong>{commentaryReferenceTab.reference.label}</strong>
                <small>
                  Showing {commentaryReferenceTab.passage.book.name} {commentaryReferenceTab.passage.chapter}:{commentaryReferenceTab.passage.verse}
                  {" "}— close this to return to {commentaryReferenceTab.previous.book.name} {commentaryReferenceTab.previous.chapter}:{commentaryReferenceTab.previous.verse}
                </small>
              </div>
              <button onClick={closeCommentaryReference} aria-label="Close referenced passage">×</button>
            </div>
          )}
          <div className="reader-heading">
            <div>
              <p className="eyebrow">{selectedBook.testament.toUpperCase()}</p>
              <div className="book-title-line">
                <h1>{selectedBook.name}</h1>
                <button className={isCurrentPlaceBookmarked ? "bookmarked" : ""} onClick={toggleReadingPlace} aria-pressed={isCurrentPlaceBookmarked} aria-label={`${isCurrentPlaceBookmarked ? "Remove bookmark from" : "Bookmark"} ${selectedBook.name} chapter ${chapter}`} title={isCurrentPlaceBookmarked ? "Remove saved reading place" : "Save this reading place"}>
                  <span className="bookmark-glyph" aria-hidden="true" />
                </button>
              </div>
              <p className="subtitle">Chapter {chapter}</p>
            </div>
            <div className="chapter-tools"><span>{verses.length ? `${verses.length} verses` : ""}</span></div>
          </div>

          {isLoading ? <div className="chapter-state"><i /><p>Opening {selectedBook.name} {chapter}…</p></div> : loadNotice ? <div className="chapter-state error"><p>{loadNotice}</p></div> : (
            <div className="verse-list" aria-label={`${selectedBook.name} chapter ${chapter}`}>
              {verses.map((verse) => {
                const isActive = activeVerse === verse.id;
                const isSelected = selectedVerse === verse.id;
                const highlightColor = highlights[verseKey(verse.id)];
                const isBatchSelected = selectedForHighlight.includes(verse.id);
                const isNoteTarget = inlineNoteVerse === verse.id || inlineSectionNoteIds.includes(verse.id);
                const hasSavedNote = savedNoteVerseIds.has(verse.id);
                const isRedLetter = Boolean(redLetterMap[verse.reference]);
                let verseWordOrdinal = -1;
                const verseWordOccurrences: Record<string, number> = {};
                return (
                  <div key={verse.id} id={`verse-${verse.id}`} className={`verse-row ${isActive ? "reading" : ""} ${isSelected ? "selected" : ""} ${highlightColor ? `highlighted highlight-${highlightColor}` : ""} ${isBatchSelected ? "batch-selected" : ""} ${isNoteTarget ? "note-target" : ""} ${isRedLetter ? "red-letter-verse" : ""}`}>
                    <button className="verse-number" onClick={() => toggleVerseSelection(verse.id)} aria-label={`${isBatchSelected ? "Remove" : "Add"} ${verse.reference} ${isBatchSelected ? "from" : "to"} highlight selection`}>{isBatchSelected ? "✓" : verse.id}</button>
                    {hasSavedNote && <span className="saved-note-indicator" aria-label={`A note is saved for ${verse.reference}`} title={`Note saved for ${verse.reference}`}>✎</span>}
                    <p
                      role="button"
                      tabIndex={0}
                      aria-label={`${isBatchSelected ? "Remove" : "Add"} ${verse.reference} ${isBatchSelected ? "from" : "to"} section selection`}
                      onClick={(event) => {
                        if (wordStudyMode && event.target === event.currentTarget) {
                          clearSelectedWord();
                          return;
                        }
                        toggleVerseSelection(verse.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          if (wordStudyMode) clearSelectedWord();
                          else toggleVerseSelection(verse.id);
                        }
                      }}
                    >
                      {verse.text.split(/(\s+)/).map((token, index) => {
                        const wordKey = `${passageKey}-${verse.id}-${index}`;
                        if (!/^\s+$/.test(token)) verseWordOrdinal += 1;
                        const currentWordOrdinal = verseWordOrdinal;
                        const normalizedToken = token.replace(/[^\p{L}\p{M}’'-]/gu, "").toLocaleLowerCase();
                        const currentWordOccurrence = verseWordOccurrences[normalizedToken] || 0;
                        if (!/^\s+$/.test(token)) verseWordOccurrences[normalizedToken] = currentWordOccurrence + 1;
                        return /^\s+$/.test(token) ? token : (
                          <button
                            key={`${token}-${index}`}
                            className={`verse-word ${wordStudyMode ? "pronunciation-ready" : ""} ${selectedWordKey === wordKey ? "word-selected" : ""} ${isRedLetter ? "red-letter-word" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (wordStudyMode) {
                                if (selectedWordKey === wordKey) clearSelectedWord();
                                else void selectWord(token, verse.id, wordKey, currentWordOrdinal, currentWordOccurrence);
                              }
                              else toggleVerseSelection(verse.id);
                            }}
                            aria-label={wordStudyMode ? `Pronounce and look up ${token.replace(/[^A-Za-zÀ-ž'-]/g, "")}` : `Select ${verse.reference}`}
                          >{token}</button>
                        );
                      })}
                      {isActive && <span className="speaking-indicator" aria-label={isPaused ? "Reading paused" : "Reading this verse"}><i /><i /><i /></span>}
                    </p>
                    <div className="verse-actions">
                      <button onClick={() => toggleHighlight(verse.id)} aria-label={`Highlight ${verse.reference}`} className={highlightColor ? "active" : ""}>✦</button>
                      <button className="edit-verse-button" onClick={() => { setSelectedVerse(verse.id); setOpenVerseMenu(openVerseMenu === verse.id ? null : verse.id); }} aria-label={`Open highlight and note tools for ${verse.reference}`} aria-expanded={openVerseMenu === verse.id}>✎</button>
                      <button onClick={() => handleVersePlayback(verse.id)} aria-label={`${isActive && isReading ? (isPaused ? "Resume" : "Pause") : "Read from"} ${verse.reference}`}>{isActive && isReading && !isPaused ? "Ⅱ" : "▶"}</button>
                      {openVerseMenu === verse.id && (
                        <div className="verse-action-menu">
                          <div className="verse-menu-heading"><strong>{verse.reference}</strong><button onClick={() => setOpenVerseMenu(null)} aria-label="Close verse menu">×</button></div>
                          <span>Highlight color</span>
                          <div className="verse-color-row">
                            {(["gold", "sage", "blue", "rose"] as HighlightColor[]).map((color) => (
                              <button key={color} className={`color-swatch ${color} ${highlightColor === color ? "selected" : ""}`} style={{ "--swatch-color": highlightSwatchColors[color] } as CSSProperties} onClick={() => setVerseHighlight(verse.id, color)} aria-label={highlightMeaningLabel(color, highlightMeanings)} title={highlightMeaningLabel(color, highlightMeanings)}>
                                <span className="swatch-chip" style={{ backgroundColor: highlightSwatchColors[color] }} />
                              </button>
                            ))}
                            {highlightColor && <button className="remove-color" onClick={() => setVerseHighlight(verse.id)} aria-label="Remove highlight">Clear</button>}
                          </div>
                          <button className="open-note-action" onClick={() => { setSelectedVerse(verse.id); setInlineSectionNoteIds([]); setInlineNoteVerse(verse.id); setInlineNoteDraft(notes[verseKey(verse.id)] || ""); setOpenVerseMenu(null); }}>⌑ Write a note</button>
                        </div>
                      )}
                    </div>
                    {inlineNoteVerse === verse.id && (
                      <div className="inline-note-editor">
                        <div className="inline-note-heading">
                          <div><strong>Note on {verse.reference}</strong><span>{verse.text}</span></div>
                          <div className="inline-note-actions">
                            <button className="save-note" onClick={() => { updateVerseNote(verse.id, inlineNoteDraft); setInlineNoteVerse(null); setInlineNoteDraft(""); }} aria-label={`Save note for ${verse.reference}`}>✓</button>
                            <button onClick={() => { setInlineNoteVerse(null); setInlineNoteDraft(""); }} aria-label={`Cancel note for ${verse.reference}`}>×</button>
                          </div>
                        </div>
                        <textarea autoFocus value={inlineNoteDraft} onChange={(event) => setInlineNoteDraft(event.target.value)} placeholder="Write your thoughts while keeping the verse in view…" aria-label={`Note for ${verse.reference}`} />
                        <small>Press ✓ to save this note</small>
                      </div>
                    )}
                    {inlineSectionNoteIds.at(-1) === verse.id && (
                      <div className="inline-note-editor section-note-editor">
                        <div className="inline-note-heading">
                          <div>
                            <strong>Note on {formatNoteReference(selectedBook.name, chapter, inlineSectionNoteIds)}</strong>
                            <span>{inlineSectionVerses.map((item) => `${item.id}. ${item.text}`).join(" ")}</span>
                          </div>
                          <div className="inline-note-actions">
                            <button className="save-note" onClick={() => { updateNoteByKey(inlineSectionNoteKey, inlineNoteDraft); setInlineSectionNoteIds([]); setInlineNoteDraft(""); }} aria-label="Save section note">✓</button>
                            <button onClick={() => { setInlineSectionNoteIds([]); setInlineNoteDraft(""); }} aria-label="Cancel section note">×</button>
                          </div>
                        </div>
                        <textarea autoFocus value={inlineNoteDraft} onChange={(event) => setInlineNoteDraft(event.target.value)} placeholder="Write your thoughts about this section…" aria-label={`Note for ${selectedBook.name} ${chapter}:${inlineSectionNoteIds.join(", ")}`} />
                        <small>Press ✓ to save this note</small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedForHighlight.length > 0 && (
            <div className="highlight-toolbar" role="toolbar" aria-label="Highlight selected verses">
              <strong>{selectedForHighlight.length} {selectedForHighlight.length === 1 ? "verse" : "verses"} selected</strong>
              <span>Highlight:</span>
              {(["gold", "sage", "blue", "rose"] as HighlightColor[]).map((color) => (
                <button key={color} className={`color-swatch ${color} ${preferredHighlightColor === color ? "preferred" : ""}`} style={{ "--swatch-color": highlightSwatchColors[color] } as CSSProperties} onClick={() => applyHighlight(color)} aria-label={highlightMeaningLabel(color, highlightMeanings)} title={highlightMeaningLabel(color, highlightMeanings)}>
                  <span className="swatch-chip" style={{ backgroundColor: highlightSwatchColors[color] }} />
                </button>
              ))}
              <button className="section-note-action" onClick={() => { const key = `${passageKey}-section-${selectedSectionIds.join("_")}`; setInlineNoteVerse(null); setInlineSectionNoteIds(selectedSectionIds); setInlineNoteDraft(notes[key] || ""); setSelectedForHighlight([]); }}>✎ Add section note</button>
              <button className="clear-highlight" onClick={() => applyHighlight()} aria-label="Remove highlighting">Clear</button>
              <button className="cancel-selection" onClick={() => setSelectedForHighlight([])} aria-label="Cancel selection">×</button>
            </div>
          )}

          <div className="chapter-end"><span /><p>End of {selectedBook.name} {chapter}</p><span /></div>
          <div className="chapter-navigation">
            <button onClick={() => goToAdjacentChapter(-1)}><b>‹</b><span>Previous chapter</span></button>
            <button onClick={() => goToAdjacentChapter(1)}><span>Next chapter</span><b>›</b></button>
          </div>
        </article>

        <aside ref={studyPanelRef} className={`study-panel ${mobileStudyOpen ? "mobile-open" : ""}`} aria-label="Study tools">
          {!studyCollapsed && <button className="study-resize-handle" onPointerDown={startStudyResize} aria-label="Resize study panel" title="Drag to make the study panel wider" />}
          <button className="study-collapse" onClick={() => setStudyCollapsed(!studyCollapsed)} aria-label={studyCollapsed ? "Open study panel" : "Collapse study panel"}>{studyCollapsed ? "‹" : "›"}</button>
          {studyCollapsed ? (
            <div className="study-rail">
              <button onClick={() => { setStudyCollapsed(false); setStudyTab("commentary"); }} aria-label="Open commentary"><span>¶</span><i>Commentary</i></button>
              <button onClick={() => { setStudyCollapsed(false); setStudyTab("lexicon"); setWordStudyMode(true); }} aria-label="Open original language"><span>א</span><i>Original language</i></button>
              <button onClick={() => { setStudyCollapsed(false); setStudyTab("notes"); }} aria-label="Open notes"><span>⌑</span><i>Notes</i></button>
            </div>
          ) : (
            <>
              <button className="close-study ui-close-button" onClick={() => setMobileStudyOpen(false)} aria-label="Close study panel">×</button>
              <div className="study-tabs" role="tablist">
                <button className={studyTab === "commentary" ? "active" : ""} onClick={() => setStudyTab("commentary")} role="tab">Commentary</button>
                <button className={studyTab === "lexicon" ? "active" : ""} onClick={() => { setStudyTab("lexicon"); setWordStudyMode(true); }} role="tab">Original language</button>
                <button className={studyTab === "notes" ? "active" : ""} onClick={() => setStudyTab("notes")} role="tab">Notes</button>
              </div>
              {studyTab === "commentary" ? (
                <div className="study-content">
                  <div className="study-reference commentary-study-reference"><span>{selected?.reference || `${selectedBook.name} ${chapter}`}</span></div>
                  <div className="commentary-source-tools">
                    <button
                      className="commentary-resource-info"
                      onClick={() => openCommentaryResourceModal()}
                      aria-label={`About ${activeCommentaryResource.title}`}
                    >
                      i
                    </button>
                  </div>
                  <div className="commentary-source-tabs" role="tablist" aria-label="Commentary source">
                    <button
                      className={commentaryView === "expository" ? "active" : ""}
                      onClick={() => {
                        if (isReadingCommentary) stopReading();
                        setCommentaryView("expository");
                      }}
                      role="tab"
                      aria-selected={commentaryView === "expository"}
                    >
                      <span>Matthew Henry</span>
                      <small>Devotional &amp; expository</small>
                    </button>
                    <button
                      className={commentaryView === "jfb" ? "active historical" : "historical"}
                      onClick={() => {
                        if (isReadingCommentary) stopReading();
                        setCommentaryView("jfb");
                      }}
                      role="tab"
                      aria-selected={commentaryView === "jfb"}
                    >
                      <span>Historical Context</span>
                      <small>JFB</small>
                    </button>
                    <button
                      className={commentaryView === "clarke" ? "active historical" : "historical"}
                      onClick={() => {
                        if (isReadingCommentary) stopReading();
                        setCommentaryView("clarke");
                      }}
                      role="tab"
                      aria-selected={commentaryView === "clarke"}
                    >
                      <span>Background</span>
                      <small>Clarke</small>
                    </button>
                  </div>
                  {commentaryView === "clarke" ? (
                    <div className="commentary-card historical-commentary-card">
                      <div className="commentary-card-top">
                        <span className="card-label">BACKGROUND · ADAM CLARKE</span>
                        <span className="historical-badge">Direct source</span>
                      </div>
                      <h2>Adam Clarke's Commentary</h2>
                      <p>
                        A fuller background layer for {selectedBook.name} {chapter}, with book introductions,
                        historical setting, and extended explanatory notes.
                      </p>
                      <div className="historical-source-note">
                        <strong>Open the chapter at the source</strong>
                        <span>
                          Clarke is public-domain, and the chapter opens directly at Bible Hub so the app
                          stays within the legal line while keeping JFB local as a fallback.
                        </span>
                      </div>
                      <a className="historical-open-button" href={clarkeUrl} target="_blank" rel="noreferrer">
                        Open {selectedBook.name} {chapter} in Clarke ↗
                      </a>
                      <div className="commentary-author">
                        <span>AC</span>
                        <div>
                          <strong>Adam Clarke</strong>
                          <small>Clarke's Commentary on the Bible · public domain</small>
                        </div>
                      </div>
                      <div className="commentary-media-plan">
                        <div>
                          <strong>Full background option</strong>
                          <span>We can add Cambridge later as another direct-linked source.</span>
                        </div>
                        <small>LINKED</small>
                      </div>
                    </div>
                  ) : commentaryStatus === "loading" ? (
                    <div className="commentary-state">Loading trusted commentary…</div>
                  ) : commentaryStatus === "error" ? (
                    <div className="commentary-state">The commentary could not be loaded just now.</div>
                  ) : activeCommentaryEntry && commentaryData ? (
                    <>
                      <div className="commentary-card">
                        <div className="commentary-card-top">
                          <span className="card-label">{commentarySourceLabel(commentaryView).toUpperCase()} · {activeCommentaryEntry.heading.toUpperCase()}</span>
                          <button className={`commentary-read-aloud ${isReadingCommentary ? "active" : ""}`} onClick={toggleCommentaryReading} aria-label={isReadingCommentary && !isCommentaryPaused ? "Pause commentary" : "Read commentary aloud"} title={isReadingCommentary && !isCommentaryPaused ? "Pause commentary" : "Read commentary aloud"}>
                            {isReadingCommentary && !isCommentaryPaused ? <span className="pause-read-aloud" aria-hidden="true">Ⅱ</span> : <span className="play-read-aloud" aria-hidden="true">▶</span>}
                          </button>
                        </div>
                        <h2>{selectedBook.name} {chapter}:{activeCommentaryEntry.verseStart}{activeCommentaryEntry.verseEnd !== activeCommentaryEntry.verseStart ? `–${activeCommentaryEntry.verseEnd}` : ""}</h2>
                        <p className={isReadingCommentary ? "commentary-reading" : ""} aria-live="off">
                          {renderCommentaryText()}
                        </p>
                        <div className="commentary-author">
                          <span>{commentarySourceInitials(commentaryData.source)}</span>
                          <div>
                            <strong>{commentaryData.source.author}</strong>
                            <small>{commentaryData.source.title}</small>
                          </div>
                        </div>
                        <a className="commentary-source" href={commentaryData.source.sourceUrl} target="_blank" rel="noreferrer">
                          {commentaryData.source.edition} · {commentaryData.source.license} ↗
                        </a>
                        {commentaryData.entries.length > 1 && (
                          <div className="commentary-section-pager" aria-label="Commentary sections">
                            <button onClick={() => turnCommentarySection(-1)} disabled={activeCommentaryEntryIndex <= 0} aria-label="Previous commentary section">‹</button>
                            <span>{activeCommentaryEntryIndex + 1} of {commentaryData.entries.length}</span>
                            <button onClick={() => turnCommentarySection(1)} disabled={activeCommentaryEntryIndex < 0 || activeCommentaryEntryIndex >= commentaryData.entries.length - 1} aria-label="Next commentary section">›</button>
                          </div>
                        )}
                      </div>
                      {activeCommentaryEntry.references.length > 0 && (
                        <div className="cross-references">
                          <h3>References in this commentary</h3>
                          <div className="reference-chips">
                            {activeCommentaryEntry.references.map((reference, index) => {
                              const href = commentaryReferenceHref(reference);
                              return href ? (
                                <a
                                  key={`${reference.osis}-${index}`}
                                  href={href}
                                  className="commentary-passage-link"
                                  aria-label={`Open ${reference.label} in this page`}
                                >
                                  {reference.label}
                                </a>
                              ) : <span key={`${reference.osis}-${index}`}>{reference.label}</span>;
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="commentary-state">
                      This CrossWire edition has no standalone entry for {selectedBook.name} {chapter}.
                    </div>
                  )}
                </div>
              ) : studyTab === "lexicon" ? (
                <div className="study-content">
                  <div className="study-reference"><span>{selectedBook.testament === "Old Testament" ? "Hebrew" : "Greek"} · {selected?.reference || `${selectedBook.name} ${chapter}`}</span><button aria-label="More lexicon options">•••</button></div>
                  <div className="word-study-control">
                    <div><strong>Select an individual word</strong><span>Its Hebrew or Greek source and pronunciation will appear here.</span></div>
                    <button className={wordStudyMode ? "active" : ""} onClick={() => { setWordStudyMode((current) => !current); setSelectedWordKey(""); }} aria-pressed={wordStudyMode}>
                      {wordStudyMode ? "On" : "Off"}
                    </button>
                  </div>
                  {selectedWord && (
                    <div className="word-lookup-card">
                      <span>SELECTED WORD</span>
                      <h3>{selectedWord}</h3>
                      {originalLookupStatus === "loading" && <p>Finding the original-language word…</p>}
                      {originalLookupStatus === "unavailable" && <p>This English word was supplied by the translators or is part of a larger phrase, so it has no separate Strong&apos;s entry here.</p>}
                      {originalLookupStatus === "error" && <p>The local original-language file could not be opened. Please try this word again.</p>}
                      {originalLookupStatus === "ready" && selectedOriginalEntries.map((entry) => (
                        <div className="lookup-match" key={entry.number}>
                          <div className="lookup-original-line">
                            <b lang={entry.lang}>{entry.word}</b>
                            <span>{entry.number}</span>
                          </div>
                          <p><i>{entry.transliteration}</i>{entry.pronunciation ? ` · ${entry.pronunciation}` : ""}</p>
                          <p>{entry.meaning}</p>
                          <button onClick={() => pronounceOriginal(entry)}>▶ Hear {entry.transliteration || "pronunciation"}{readOriginalDefinition ? " + definition" : ""}</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="lexicon-intro-row">
                    <p className="lexicon-intro">{wordStudyMode ? "Choose any single word in the chapter. A new choice replaces the previous one." : "Turn word selection on to look up a word."}</p>
                    {selectedOriginalEntries.length > 1 && <button onClick={() => readOriginalWords(selectedOriginalEntries)}>▶ Hear all</button>}
                  </div>
                  {!selectedWord && <div className="lexicon-empty-state"><span aria-hidden="true">א · α</span><p>Select a word in the Bible text to see its original form, transliteration, meaning, and pronunciation.</p></div>}
                  <p className="lexicon-attribution">Word tagging from the public-domain CrossWire KJV; dictionary data from Open Scriptures.</p>
                </div>
              ) : (
                <div className="study-content notes-tab-content">
                  <div className="study-reference"><span>Notes · {noteReference}</span><small>{chapterNotes.length + sectionNotes.length} in this chapter</small></div>
                  <div className="notes-card open">
                    <div className="notes-heading"><span><i>⌑</i> Note for {selectedSectionIds.length > 1 ? "selected section" : "selected verse"}</span></div>
                    <textarea value={noteValue} onChange={(event) => updateNote(event.target.value)} placeholder="What are you noticing?" aria-label={`Note for ${noteReference}`} />
                    <div className="saved-state"><span>✓ Saved on this device</span><small>{noteValue.length}/500</small></div>
                  </div>
                  {chapterNotes.length > 0 && <div className="chapter-notes-list"><h3>Chapter notes</h3>{chapterNotes.map((verse) => <button key={verse.id} onClick={() => setSelectedVerse(verse.id)}><strong>{verse.reference}</strong><span>{notes[verseKey(verse.id)]}</span></button>)}</div>}
                  {sectionNotes.length > 0 && <div className="chapter-notes-list"><h3>Section notes</h3>{sectionNotes.map((note) => <button key={note.key}><strong>{note.reference}</strong><span>{note.value}</span></button>)}</div>}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      <button className="mobile-study-button" onClick={() => setMobileStudyOpen(true)}>Study tools</button>
      <nav className={`floating-chapter-navigation ${studyCollapsed ? "study-collapsed" : ""} ${selectedForHighlight.length ? "selection-active" : ""}`} aria-label="Chapter navigation">
        <button onClick={() => goToAdjacentChapter(-1)} disabled={!hasPreviousChapter} aria-label="Previous chapter" title="Previous chapter">‹</button>
        <button onClick={() => goToAdjacentChapter(1)} disabled={!hasNextChapter} aria-label="Next chapter" title="Next chapter">›</button>
      </nav>

      {audioDockEnabled && (
        <section className={`audio-dock ${audioDockCollapsed ? "collapsed" : ""}`} aria-label="Read aloud controls">
          {!audioDockCollapsed && <div className="now-reading"><span className="audio-pulse">◖</span><div><small>{isPaused ? "PAUSED" : isReading ? "READING" : "READ ALOUD"}</small><strong title={activeVerse ? `${selectedBook.name} ${chapter}:${activeVerse}` : `${selectedBook.name} ${chapter}`}>{activeVerse ? `${selectedBook.name} ${chapter}:${activeVerse}` : `${selectedBook.name} ${chapter}`}</strong></div></div>}
          <div className="transport">
            <button className="skip-button" aria-label="Previous verse" onClick={() => jumpToVerse(Math.max(verses[0]?.id || 1, (activeVerse || selectedVerse) - 1))}>‹<span>|</span></button>
            {!isReading ? <button className="play-button" onClick={() => startReading()} aria-label="Start read aloud">▶</button> : <button className="play-button" onClick={togglePause} aria-label={isPaused ? "Resume read aloud" : "Pause read aloud"}>{isPaused ? "▶" : "Ⅱ"}</button>}
            <button className="skip-button" aria-label="Next verse" onClick={() => jumpToVerse(Math.min(verses.at(-1)?.id || 1, (activeVerse || selectedVerse) + 1))}><span>|</span>›</button>
          </div>
          <button className="audio-collapse-button" onClick={() => { const next = !audioDockCollapsed; setAudioDockCollapsed(next); localStorage.setItem("selah-audio-dock-collapsed", String(next)); setAudioSettingsOpen(false); }} aria-label={audioDockCollapsed ? "Expand read aloud controls" : "Collapse read aloud controls"}>{audioDockCollapsed ? "+" : "−"}</button>
        </section>
      )}
    </main>
  );
}
