"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type Verse = { id: number; reference: string; text: string };
type Book = { name: string; chapters: number; testament: "Old Testament" | "New Testament" };
type Picker = "books" | "chapters" | null;
type StudyTab = "commentary" | "lexicon" | "notes";
type CommentaryView = "expository" | "historical";
type HighlightColor = "gold" | "sage" | "blue" | "rose";
type ThemePreference = "system" | "light" | "dark" | "true-dark";
type AudioSourcePreference = "auto" | "official" | "david";
type LexiconEntry = { word: string; transliteration: string; pronunciation: string; spoken: string; number: string; meaning: string; lang: "he-IL" | "el-GR" };
type OriginalWordToken = { text: string; strongs?: string[] };
type OriginalLanguageBook = { source: string; verses: Record<string, OriginalWordToken[]> };
type StrongDictionaryEntry = { lemma: string; transliteration: string; pronunciation: string; definition: string; kjv: string };
type StrongDictionary = Record<string, StrongDictionaryEntry>;
type SavedAudioManifest = { chapters: string[]; chapterFiles?: Record<string, string>; format?: string; source?: string };
type CommentaryReference = { osis: string; label: string };
type CommentaryEntry = { anchorVerse: number; verseStart: number; verseEnd: number; heading: string; text: string; references: CommentaryReference[] };
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
type SavedReference = { key: string; book: Book; chapter: number; verseIds: number[]; reference: string };
type SavedTextCache = Record<string, Record<number, string>>;
type BibleSourceVerse = { verse: string; text: string };
type BibleSourceChapter = { chapter: string; verses: BibleSourceVerse[] };
type BibleSourceBook = { book: string; chapters: BibleSourceChapter[] };
type BibleSearchResult = { book: Book; chapter: number; verse: number; reference: string; text: string; rank: number; kind: "match" | "suggestion" };

const STUDY_PANEL_WIDTH_STORAGE_KEY = "selah-study-panel-width-v1";
const MIN_STUDY_PANEL_WIDTH = 380;
const MAX_STUDY_PANEL_WIDTH = 680;
const OFFICIAL_AUDIO_ENABLED = false;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function chapterAudioBase(book: string, chapterNumber: number) {
  return `/audio/${bookSlug(book)}/${chapterNumber}`;
}

function chapterMp3AudioPath(book: string, chapterNumber: number) {
  return `/audio/${bookSlug(book)}/${chapterNumber}.mp3`;
}

function bibleFileName(name: string) {
  return `${name.replace(/\s+/g, "")}.json`;
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
  const [rate, setRate] = useState(0.92);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [savedAudioChapters, setSavedAudioChapters] = useState<Set<string>>(new Set());
  const [chapterAudioFiles, setChapterAudioFiles] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState<Record<string, HighlightColor>>({});
  const [savedTextCache, setSavedTextCache] = useState<SavedTextCache>({});
  const [redLetterMap, setRedLetterMap] = useState<Record<string, string>>({});
  const [preferredHighlightColor, setPreferredHighlightColor] = useState<HighlightColor>("gold");
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
  const [audioDockCollapsed, setAudioDockCollapsed] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [audioSourcePreference, setAudioSourcePreference] = useState<AudioSourcePreference>("auto");
  const [studyPanelWidth, setStudyPanelWidth] = useState(MIN_STUDY_PANEL_WIDTH);
  const [isResizingStudy, setIsResizingStudy] = useState(false);
  const [readOriginalDefinition, setReadOriginalDefinition] = useState(false);
  const [commentaryData, setCommentaryData] = useState<CommentaryChapter | null>(null);
  const [commentaryStatus, setCommentaryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bookmark, setBookmark] = useState<SavedPlace | null>(null);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [savedViewTab, setSavedViewTab] = useState<"highlights" | "notes">("highlights");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "ready" | "error">("idle");
  const [isReadingCommentary, setIsReadingCommentary] = useState(false);
  const [isCommentaryPaused, setIsCommentaryPaused] = useState(false);
  const [commentaryWordIndex, setCommentaryWordIndex] = useState<number | null>(null);
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

  useEffect(() => {
    queueMicrotask(() => {
      const savedHighlights = localStorage.getItem("selah-highlights-v2");
      const savedNotes = localStorage.getItem("selah-notes-v2");
      const savedPlace = localStorage.getItem("selah-reading-place-v1");
      const savedHighlightColor = localStorage.getItem("selah-highlight-color") as HighlightColor | null;
      const savedDockCollapsed = localStorage.getItem("selah-audio-dock-collapsed");
      const savedTheme = localStorage.getItem("selah-theme") as ThemePreference | null;
      const savedAudioSource = localStorage.getItem("selah-audio-source") as AudioSourcePreference | null;
      const savedOriginalDefinition = localStorage.getItem("selah-read-original-definition");
      const savedStudyPanelWidth = Number(localStorage.getItem(STUDY_PANEL_WIDTH_STORAGE_KEY));
      if (savedHighlights) {
        const parsed = JSON.parse(savedHighlights) as string[] | Record<string, HighlightColor>;
        setHighlights(Array.isArray(parsed) ? Object.fromEntries(parsed.map((key) => [key, "gold" as HighlightColor])) : parsed);
      }
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedHighlightColor && ["gold", "sage", "blue", "rose"].includes(savedHighlightColor)) setPreferredHighlightColor(savedHighlightColor);
      if (savedDockCollapsed === "true") setAudioDockCollapsed(true);
      if (savedTheme && ["system", "light", "dark", "true-dark"].includes(savedTheme)) setThemePreference(savedTheme);
      if (savedAudioSource && ["auto", "official", "david"].includes(savedAudioSource)) {
        setAudioSourcePreference(savedAudioSource === "official" && !OFFICIAL_AUDIO_ENABLED ? "david" : savedAudioSource);
      }
      if (savedOriginalDefinition === "true") setReadOriginalDefinition(true);
      if (Number.isFinite(savedStudyPanelWidth)) setStudyPanelWidth(clampNumber(savedStudyPanelWidth, MIN_STUDY_PANEL_WIDTH, MAX_STUDY_PANEL_WIDTH));
      if (savedPlace) {
        const parsed = JSON.parse(savedPlace) as SavedPlace;
        const savedBook = books.find((book) => book.name === parsed.book);
        if (savedBook && parsed.chapter >= 1 && parsed.chapter <= savedBook.chapters) {
          setBookmark(parsed);
          setSelectedBook(savedBook);
          setChapter(parsed.chapter);
        }
      }
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
    setCommentaryStatus("loading");
    setCommentaryData(null);
    fetch(`/commentary/mhcc/${bookSlug(selectedBook.name)}/${chapter}.json`)
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
  }, [selectedBook.name, chapter]);

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

  const commentaryTokens = useMemo(() => activeCommentaryEntry?.text.split(/(\s+)/) || [], [activeCommentaryEntry]);

  useEffect(() => {
    if (!isReadingCommentary || isCommentaryPaused || commentaryView !== "expository" || commentaryWordIndex === null) return;
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

  const historicalCommentaryUrl = `https://biblehub.com/commentaries/cambridge/${bibleHubBookSlug(selectedBook.name)}/${chapter}.htm`;
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

  useEffect(() => {
    if (!verses.length) return;
    const cacheKey = savedTextCacheKey(selectedBook.name, chapter);
    setSavedTextCache((current) => ({
      ...current,
      [cacheKey]: Object.fromEntries(verses.map((verse) => [verse.id, verse.text])),
    }));
  }, [selectedBook.name, chapter, verses]);

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
    stopReading();
    const utterance = new SpeechSynthesisUtterance(`${saved.reference}. ${text}`);
    utterance.rate = rate;
    utterance.voice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices) || null;
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);
    setIsReading(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
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
          <div><strong>Selah</strong><span>Scripture, slowly</span></div>
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
                <button onClick={() => setPicker(null)} aria-label="Close chapter menu">×</button>
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
            <button onClick={() => setAudioSettingsOpen(false)} aria-label="Close settings">X</button>
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
              <label className="speed-control"><span>Speed</span><input type="range" min="0.7" max="1.25" step="0.05" value={rate} onChange={(event) => setRate(Number(event.target.value))} /><strong>{rate.toFixed(2)}x</strong></label>
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
                    <option value="dark">Green dark</option>
                    <option value="true-dark">True dark</option>
                  </select>
                </label>
              </div>
              <div className="settings-card">
                <div className="settings-card-heading">
                  <span>ORIGINAL LANGUAGE</span>
                  <strong>Pronunciation</strong>
                </div>
                <label className="settings-checkbox">
                  <span>Definition</span>
                  <input type="checkbox" checked={readOriginalDefinition} onChange={(event) => {
                    const enabled = event.target.checked;
                    setReadOriginalDefinition(enabled);
                    localStorage.setItem("selah-read-original-definition", String(enabled));
                  }} />
                  <strong>{readOriginalDefinition ? "On" : "Off"}</strong>
                </label>
                <p className="settings-help">When enabled, Selah reads the English definition immediately after pronouncing the Hebrew or Greek word.</p>
              </div>
              <div className="settings-card settings-card-muted">
                <div className="settings-card-heading">
                  <span>OFFICIAL AUDIO BIBLE</span>
                  <strong>{OFFICIAL_AUDIO_ENABLED && hasChapterMp3Audio ? "Ready for this chapter" : "Disabled right now"}</strong>
                </div>
                <p>No API key is required. The official audio files stay local for now, and Selah uses Microsoft David in the app until we turn the chapter recordings back on.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {savedPanelOpen && (
        <section className="saved-library saved-library-window" aria-modal="true" role="dialog" aria-label="Saved highlights and notes">
          <div className="saved-library-heading">
            <div><span>YOUR LIBRARY</span><strong>Saved</strong></div>
            <button onClick={() => setSavedPanelOpen(false)} aria-label="Close saved section">X</button>
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
                    return (
                      <div className="saved-list-item" key={saved.key}>
                        <button className="saved-jump" onClick={() => openSavedReference(saved)}>
                          <i className={`saved-color ${color}`} aria-hidden="true" />
                          <span><strong>{saved.reference}</strong><small>{text ? excerptText(text) : "Loading verse text..."}</small></span>
                          <b>Jump</b>
                        </button>
                        <button className="saved-read-aloud" onClick={() => readSavedReference(saved)} disabled={!text} aria-label={`Read ${saved.reference} aloud`}>Read aloud</button>
                      </div>
                    );
                  }) : <p>No saved highlights yet.</p>}
                </div>
              ) : (
                <div className="saved-list">
                  {recentNotes.length ? recentNotes.map(({ saved, value }) => {
                    const text = savedVerseText(saved);
                    return (
                      <div className="saved-list-item" key={saved.key}>
                        <button className="saved-jump" onClick={() => openSavedReference(saved)}>
                          <i className="saved-pencil" aria-hidden="true">✎</i>
                          <span><strong>{saved.reference}</strong><small>{value}</small></span>
                          <b>Jump</b>
                        </button>
                        <button className="saved-read-aloud" onClick={() => readSavedReference(saved)} disabled={!text} aria-label={`Read ${saved.reference} aloud`}>Read aloud</button>
                      </div>
                    );
                  }) : <p>No saved notes yet.</p>}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {searchPanelOpen && (
        <section className="search-library" aria-modal="true" role="dialog" aria-label="Bible search results">
          <div className="search-library-heading">
            <div><span>BIBLE SEARCH</span><strong>Search Results</strong></div>
            <button onClick={() => setSearchPanelOpen(false)} aria-label="Close Bible search">X</button>
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
              {searchResults.map((result) => (
                  <button key={`${result.reference}-${result.rank}-${result.kind}`} className={result.kind === "suggestion" ? "search-suggestion" : ""} onClick={() => openSearchResult(result)}>
                    <div className="search-result-copy">
                      <strong>{result.reference}</strong>
                      <span className="search-result-text">
                      {renderSearchVerseText(result)}
                      {result.kind === "suggestion" && <em>Related suggestion</em>}
                      </span>
                    </div>
                  </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {picker === "books" && (
        <>
          <button className="picker-backdrop" onClick={() => setPicker(null)} aria-label="Close passage picker" />
          <section className="passage-menu book-menu" aria-label="Books of the Bible">
                <div className="passage-menu-heading">
                  <div><span>BIBLE</span><h2>Choose a book</h2></div>
                  <button onClick={() => setPicker(null)} aria-label="Close">×</button>
                </div>
                <label className="book-search">
                  <span className="sr-only">Filter Bible books</span>
                  <b aria-hidden="true">⌕</b>
                  <input autoFocus value={bookFilter} onChange={(event) => setBookFilter(event.target.value)} placeholder="Search for a book…" />
                </label>
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
        <article className="reader">
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
                      onClick={() => toggleVerseSelection(verse.id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") toggleVerseSelection(verse.id); }}
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
                              if (wordStudyMode) void selectWord(token, verse.id, wordKey, currentWordOrdinal, currentWordOccurrence);
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
                            {(["gold", "sage", "blue", "rose"] as HighlightColor[]).map((color) => <button key={color} className={`color-swatch ${color} ${highlightColor === color ? "selected" : ""}`} onClick={() => setVerseHighlight(verse.id, color)} aria-label={`Highlight ${color}`} title={preferredHighlightColor === color ? "Preferred highlight color" : undefined} />)}
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
              {(["gold", "sage", "blue", "rose"] as HighlightColor[]).map((color) => <button key={color} className={`color-swatch ${color} ${preferredHighlightColor === color ? "preferred" : ""}`} onClick={() => applyHighlight(color)} aria-label={`Highlight ${color}`} />)}
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
              <button className="close-study" onClick={() => setMobileStudyOpen(false)} aria-label="Close study panel">×</button>
              <div className="study-tabs" role="tablist">
                <button className={studyTab === "commentary" ? "active" : ""} onClick={() => setStudyTab("commentary")} role="tab">Commentary</button>
                <button className={studyTab === "lexicon" ? "active" : ""} onClick={() => { setStudyTab("lexicon"); setWordStudyMode(true); }} role="tab">Original language</button>
                <button className={studyTab === "notes" ? "active" : ""} onClick={() => setStudyTab("notes")} role="tab">Notes</button>
              </div>
              {studyTab === "commentary" ? (
                <div className="study-content">
                  <div className="study-reference"><span>{selected?.reference || `${selectedBook.name} ${chapter}`}</span><small>Public domain</small></div>
                  <div className="commentary-source-tabs" role="tablist" aria-label="Commentary source">
                    <button
                      className={commentaryView === "expository" ? "active" : ""}
                      onClick={() => setCommentaryView("expository")}
                      role="tab"
                      aria-selected={commentaryView === "expository"}
                    >
                      <span>Matthew Henry</span>
                      <small>Devotional &amp; expository</small>
                    </button>
                    <button
                      className={commentaryView === "historical" ? "active historical" : "historical"}
                      onClick={() => {
                        if (isReadingCommentary) stopReading();
                        setCommentaryView("historical");
                      }}
                      role="tab"
                      aria-selected={commentaryView === "historical"}
                    >
                      <span>Historical Context</span>
                      <small>Cambridge</small>
                    </button>
                  </div>
                  {commentaryView === "historical" ? (
                    <div className="commentary-card historical-commentary-card">
                      <div className="commentary-card-top">
                        <span className="card-label">HISTORICAL CONTEXT</span>
                        <span className="historical-badge">Historically based</span>
                      </div>
                      <h2>Cambridge Bible for Schools and Colleges</h2>
                      <p>
                        Scholarly background for {selectedBook.name} {chapter}, with historical setting,
                        literary analysis, original-language observations, outlines, and verse-by-verse notes.
                      </p>
                      <div className="historical-source-note">
                        <strong>Read at the authorized source</strong>
                        <span>
                          The available digital transcription is hosted by Bible Hub courtesy of BibleSupport.
                          It opens separately so the app does not re-publish text licensed to another host.
                        </span>
                      </div>
                      <a className="historical-open-button" href={historicalCommentaryUrl} target="_blank" rel="noreferrer">
                        Open {selectedBook.name} {chapter} historical commentary ↗
                      </a>
                      <div className="commentary-author">
                        <span>CB</span>
                        <div>
                          <strong>Cambridge Bible contributors</strong>
                          <small>Cambridge University Press · 1878–1922</small>
                        </div>
                      </div>
                      <div className="commentary-media-plan">
                        <div>
                          <strong>Maps, plates &amp; diagrams</strong>
                          <span>Reserved for a future side-by-side media view.</span>
                        </div>
                        <small>PLANNED</small>
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
                          <span className="card-label">COMMENTARY · {activeCommentaryEntry.heading.toUpperCase()}</span>
                          <button className={isReadingCommentary ? "active" : ""} onClick={toggleCommentaryReading} aria-label={isReadingCommentary && !isCommentaryPaused ? "Pause commentary" : "Read commentary aloud"}>
                            {isReadingCommentary && !isCommentaryPaused ? "Ⅱ Pause" : "▶ Read aloud"}
                          </button>
                        </div>
                        <h2>{selectedBook.name} {chapter}:{activeCommentaryEntry.verseStart}{activeCommentaryEntry.verseEnd !== activeCommentaryEntry.verseStart ? `–${activeCommentaryEntry.verseEnd}` : ""}</h2>
                        <p className={isReadingCommentary ? "commentary-reading" : ""} aria-live="off">
                          {commentaryTokens.map((token, index) => /^\s+$/.test(token) ? token : (
                            <span key={`${token}-${index}`} className={commentaryWordIndex === index ? "commentary-spoken-word" : ""}>{token}</span>
                          ))}
                        </p>
                        <div className="commentary-author">
                          <span>MH</span>
                          <div>
                            <strong>{commentaryData.source.author}</strong>
                            <small>{commentaryData.source.title}</small>
                          </div>
                        </div>
                        <a className="commentary-source" href={commentaryData.source.sourceUrl} target="_blank" rel="noreferrer">
                          {commentaryData.source.edition} · {commentaryData.source.license} ↗
                        </a>
                      </div>
                      {activeCommentaryEntry.references.length > 0 && (
                        <div className="cross-references">
                          <h3>References in this commentary</h3>
                          <div className="reference-chips">
                            {activeCommentaryEntry.references.map((reference, index) => <span key={`${reference.osis}-${index}`}>{reference.label}</span>)}
                          </div>
                        </div>
                      )}
                      {commentaryData.entries.length > 1 && (
                        <details className="chapter-commentary-list">
                          <summary>Browse all {commentaryData.entries.length} sections in this chapter</summary>
                          {commentaryData.entries.map((entry) => (
                            <button key={`${entry.anchorVerse}-${entry.heading}`} onClick={() => setSelectedVerse(entry.verseStart)}>
                              <strong>{entry.heading}</strong>
                              <span>{entry.text.slice(0, 105)}{entry.text.length > 105 ? "…" : ""}</span>
                            </button>
                          ))}
                        </details>
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

      <section className={`audio-dock ${audioDockCollapsed ? "collapsed" : ""}`} aria-label="Read aloud controls">
        {!audioDockCollapsed && <div className="now-reading"><span className="audio-pulse">◖</span><div><small>{isPaused ? "PAUSED" : isReading ? "READING" : "READ ALOUD"}</small><strong title={activeVerse ? `${selectedBook.name} ${chapter}:${activeVerse}` : `${selectedBook.name} ${chapter}`}>{activeVerse ? `${selectedBook.name} ${chapter}:${activeVerse}` : `${selectedBook.name} ${chapter}`}</strong></div></div>}
        <div className="transport">
          <button className="skip-button" aria-label="Previous verse" onClick={() => jumpToVerse(Math.max(verses[0]?.id || 1, (activeVerse || selectedVerse) - 1))}>‹<span>|</span></button>
          {!isReading ? <button className="play-button" onClick={() => startReading()} aria-label="Start read aloud">▶</button> : <button className="play-button" onClick={togglePause} aria-label={isPaused ? "Resume read aloud" : "Pause read aloud"}>{isPaused ? "▶" : "Ⅱ"}</button>}
          <button className="skip-button" aria-label="Next verse" onClick={() => jumpToVerse(Math.min(verses.at(-1)?.id || 1, (activeVerse || selectedVerse) + 1))}><span>|</span>›</button>
        </div>
        <button className="audio-collapse-button" onClick={() => { const next = !audioDockCollapsed; setAudioDockCollapsed(next); localStorage.setItem("selah-audio-dock-collapsed", String(next)); setAudioSettingsOpen(false); }} aria-label={audioDockCollapsed ? "Expand read aloud controls" : "Collapse read aloud controls"}>{audioDockCollapsed ? "+" : "−"}</button>
      </section>
    </main>
  );
}
