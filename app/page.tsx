"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Verse = { id: number; reference: string; text: string };
type Book = { name: string; chapters: number; testament: "Old Testament" | "New Testament" };
type Picker = "books" | "chapters" | null;
type StudyTab = "commentary" | "lexicon" | "notes";
type HighlightColor = "gold" | "sage" | "blue" | "rose";
type LexiconEntry = { word: string; transliteration: string; pronunciation: string; spoken: string; number: string; meaning: string; lang: "he-IL" | "el-GR" };
type SavedAudioManifest = { chapters: string[] };
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

function bestVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const david = english.find((voice) => voice.name.toLowerCase().includes("microsoft david"));
  if (david) return david;
  const preferred = ["microsoft ava", "microsoft andrew", "microsoft emma", "microsoft brian", "natural", "neural", "samantha", "daniel", "aria", "guy", "google us english"];
  return english.find((voice) => preferred.some((name) => voice.name.toLowerCase().includes(name))) || english.find((voice) => voice.localService) || english[0] || voices[0];
}

function voiceRank(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  if (name.includes("microsoft david")) return 0;
  if (name.includes("microsoft zira")) return 1;
  if (name.includes("natural") || name.includes("neural")) return 2;
  if (name.includes("microsoft")) return 3;
  return 10;
}

function bookSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function chapterAudioBase(book: string, chapterNumber: number) {
  return `/audio/${bookSlug(book)}/${chapterNumber}`;
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
  const [highlights, setHighlights] = useState<Record<string, HighlightColor>>({});
  const [selectedForHighlight, setSelectedForHighlight] = useState<number[]>([]);
  const [selectedWord, setSelectedWord] = useState("");
  const [openVerseMenu, setOpenVerseMenu] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [studyTab, setStudyTab] = useState<StudyTab>("commentary");
  const [studyCollapsed, setStudyCollapsed] = useState(false);
  const [mobileStudyOpen, setMobileStudyOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [commentaryData, setCommentaryData] = useState<CommentaryChapter | null>(null);
  const [commentaryStatus, setCommentaryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bookmark, setBookmark] = useState<SavedPlace | null>(null);
  const [isReadingCommentary, setIsReadingCommentary] = useState(false);
  const [isCommentaryPaused, setIsCommentaryPaused] = useState(false);
  const cancelled = useRef(false);
  const activeAudio = useRef<HTMLAudioElement | null>(null);

  const passageKey = `${selectedBook.name}-${chapter}`;
  const verseKey = (id: number) => `${passageKey}-${id}`;
  const chapterAudioKey = `${bookSlug(selectedBook.name)}-${chapter}`;
  const chapterAudioPrefix = chapterAudioBase(selectedBook.name, chapter);
  const selected = verses.find((verse) => verse.id === selectedVerse) || verses[0];

  useEffect(() => {
    queueMicrotask(() => {
      const savedHighlights = localStorage.getItem("selah-highlights-v2");
      const savedNotes = localStorage.getItem("selah-notes-v2");
      const savedPlace = localStorage.getItem("selah-reading-place-v1");
      if (savedHighlights) {
        const parsed = JSON.parse(savedHighlights) as string[] | Record<string, HighlightColor>;
        setHighlights(Array.isArray(parsed) ? Object.fromEntries(parsed.map((key) => [key, "gold" as HighlightColor])) : parsed);
      }
      if (savedNotes) setNotes(JSON.parse(savedNotes));
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

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const savedVoice = localStorage.getItem("selah-voice");
      setVoiceName((current) => current || available.find((voice) => voice.name === savedVoice)?.name || bestVoice(available)?.name || "");
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
      if (selectedBook.name === "Genesis" && chapter === 1) {
        setVerses(genesisOne);
        setLoadNotice("");
        setSelectedVerse(1);
        return;
      }
      setIsLoading(true);
      setLoadNotice("");
      try {
        const reference = encodeURIComponent(`${selectedBook.name} ${chapter}`);
        const response = await fetch(`https://bible-api.com/${reference}?translation=kjv&single_chapter_book_matching=indifferent`);
        if (!response.ok) throw new Error("Passage unavailable");
        const data = await response.json() as { verses?: Array<{ verse: number; text: string }> };
        if (!data.verses?.length) throw new Error("No verses returned");
        if (!ignore) {
          setVerses(data.verses.map((verse) => ({
            id: verse.verse,
            reference: `${selectedBook.name} ${chapter}:${verse.verse}`,
            text: verse.text.trim(),
          })));
          setSelectedVerse(data.verses[0].verse);
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
      setIsReading(false);
      setIsPaused(false);
      setIsReadingCommentary(false);
      setIsCommentaryPaused(false);
      setActiveVerse(null);
      setSelectedForHighlight([]);
      loadChapter();
    });
    return () => { ignore = true; };
  }, [selectedBook, chapter]);

  const stopReading = useCallback(() => {
    cancelled.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current.currentTime = 0;
      activeAudio.current = null;
    }
    setIsReading(false);
    setIsPaused(false);
    setIsReadingCommentary(false);
    setIsCommentaryPaused(false);
    setActiveVerse(null);
  }, []);

  function playBrowserVerse(index: number) {
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
      if (!cancelled.current && index + 1 < verses.length) playBrowserVerse(index + 1);
      else if (!cancelled.current) {
        setIsReading(false);
        setActiveVerse(null);
      }
    };
    utterance.onerror = () => {
      setIsReading(false);
      setActiveVerse(null);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function playSavedVerse(index: number, includeIntro: boolean) {
    if (cancelled.current) return;
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
      if (!introOk || cancelled.current) {
        setSavedAudioChapters((current) => {
          const next = new Set(current);
          next.delete(chapterAudioKey);
          return next;
        });
        playBrowserVerse(index);
        return;
      }
    }

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

    if (!verseOk || cancelled.current) {
      setSavedAudioChapters((current) => {
        const next = new Set(current);
        next.delete(chapterAudioKey);
        return next;
      });
      playBrowserVerse(index);
      return;
    }

    if (!cancelled.current && index + 1 < verses.length) {
      void playSavedVerse(index + 1, false);
    } else if (!cancelled.current) {
      setIsReading(false);
      setActiveVerse(null);
    }
  }

  function startReading(verseId = selectedVerse) {
    if (!verses.length) return;
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
    if (savedAudioChapters.has(chapterAudioKey)) {
      void playSavedVerse(index, verseId === verses[0]?.id);
      return;
    }
    playBrowserVerse(index);
  }

  const jumpToVerse = (id: number) => {
    const index = Math.max(0, verses.findIndex((verse) => verse.id === id));
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current.currentTime = 0;
      activeAudio.current = null;
    }
    cancelled.current = false;
    setIsReading(true);
    setIsPaused(false);
    if (savedAudioChapters.has(chapterAudioKey)) void playSavedVerse(index, false);
    else playBrowserVerse(index);
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
    setSelectedForHighlight((current) => current.includes(id) ? current.filter((verseId) => verseId !== id) : [...current, id]);
  };

  const applyHighlight = (color?: HighlightColor) => {
    const next = { ...highlights };
    selectedForHighlight.forEach((id) => {
      const key = verseKey(id);
      if (color) next[key] = color;
      else delete next[key];
    });
    setHighlights(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
    setSelectedForHighlight([]);
  };

  const toggleHighlight = (id: number) => {
    const key = verseKey(id);
    const next = { ...highlights };
    if (next[key]) delete next[key];
    else next[key] = "gold";
    setHighlights(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
  };

  const setVerseHighlight = (id: number, color?: HighlightColor) => {
    const key = verseKey(id);
    const next = { ...highlights };
    if (color) next[key] = color;
    else delete next[key];
    setHighlights(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
    setOpenVerseMenu(null);
  };

  const selectWord = (word: string, verseId: number) => {
    const cleaned = word.replace(/[^A-Za-zÀ-ž'-]/g, "");
    if (!cleaned) return;
    setSelectedWord(cleaned);
    setSelectedVerse(verseId);
    setStudyTab("lexicon");
    setStudyCollapsed(false);
    setMobileStudyOpen(true);
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
      });
    }, 90);
  };

  const updateNote = (value: string) => {
    const key = verseKey(selectedVerse);
    const next = { ...notes, [key]: value };
    setNotes(next);
    localStorage.setItem("selah-notes-v2", JSON.stringify(next));
  };

  const chooseBook = (book: Book) => {
    setSelectedBook(book);
    setChapter(1);
    setBookFilter("");
    setPicker("chapters");
  };

  const saveReadingPlace = () => {
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
  const sortedVoices = useMemo(() => voices.filter((voice) => voice.lang.toLowerCase().startsWith("en")).sort((a, b) => voiceRank(a) - voiceRank(b) || a.name.localeCompare(b.name)), [voices]);
  const activeLexicon = selectedBook.testament === "Old Testament" ? hebrewLexicon : greekLexicon;
  const selectedLookupEntry = useMemo(() => {
    const word = selectedWord.toLowerCase();
    if (["beginning", "first", "origin"].includes(word)) return activeLexicon[0];
    if (["god", "gods", "divine"].includes(word)) return activeLexicon[1];
    if (["created", "create", "made", "word"].includes(word)) return activeLexicon[2];
    return undefined;
  }, [activeLexicon, selectedWord]);
  const activeCommentaryEntry = useMemo(() => {
    const entries = commentaryData?.entries || [];
    return entries.find((entry) => selectedVerse >= entry.verseStart && selectedVerse <= entry.verseEnd)
      || [...entries].reverse().find((entry) => entry.anchorVerse <= selectedVerse)
      || entries[0];
  }, [commentaryData, selectedVerse]);
  const chapterNotes = verses.filter((verse) => Boolean(notes[verseKey(verse.id)]));
  const noteValue = notes[verseKey(selectedVerse)] || "";
  const isCurrentPlaceBookmarked = bookmark?.book === selectedBook.name && bookmark.chapter === chapter;

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
    const utterance = new SpeechSynthesisUtterance(
      `${selectedBook.name} ${chapter}. ${activeCommentaryEntry.heading}. ${activeCommentaryEntry.text}`,
    );
    utterance.rate = rate;
    utterance.voice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices) || null;
    utterance.onend = () => {
      setIsReadingCommentary(false);
      setIsCommentaryPaused(false);
    };
    utterance.onerror = () => {
      setIsReadingCommentary(false);
      setIsCommentaryPaused(false);
    };
    setIsReadingCommentary(true);
    setIsCommentaryPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div><strong>Selah</strong><span>Scripture, slowly</span></div>
        </div>

        <div className="passage-picker" aria-label="Choose a Bible passage">
          <button className="book-button" onClick={() => setPicker(picker === "books" ? null : "books")} aria-expanded={picker === "books"}>
            {selectedBook.name} <span>⌄</span>
          </button>
          <div className="divider" />
          <button className="chapter-arrow" onClick={() => goToAdjacentChapter(-1)} aria-label="Previous chapter">‹</button>
          <button className="chapter-button" onClick={() => setPicker(picker === "chapters" ? null : "chapters")} aria-expanded={picker === "chapters"}>
            Chapter {chapter} <span>⌄</span>
          </button>
          <button className="chapter-arrow" onClick={() => goToAdjacentChapter(1)} aria-label="Next chapter">›</button>
        </div>

        <div className="header-actions">
          <span className="translation-badge">KJV</span>
          <button className="avatar" aria-label="Profile">BL</button>
        </div>
      </header>

      {picker && (
        <>
          <button className="picker-backdrop" onClick={() => setPicker(null)} aria-label="Close passage picker" />
          <section className={`passage-menu ${picker === "books" ? "book-menu" : "chapter-menu"}`} aria-label={picker === "books" ? "Books of the Bible" : `Chapters in ${selectedBook.name}`}>
            {picker === "books" ? (
              <>
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
              </>
            ) : (
              <>
                <div className="chapter-menu-heading">
                  <button onClick={() => setPicker("books")} aria-label="Back to books">←</button>
                  <div><strong>CHAPTER</strong><span>{selectedBook.name}</span></div>
                  <button onClick={() => setPicker(null)}>Cancel</button>
                </div>
                <div className="chapter-grid">
                  {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((number) => (
                    <button key={number} className={number === chapter ? "selected" : ""} onClick={() => { setChapter(number); setPicker(null); }}>{number}</button>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}

      <div className={`workspace ${studyCollapsed ? "study-collapsed" : ""}`}>
        <article className="reader">
          <div className="reader-heading">
            <div>
              <p className="eyebrow">{selectedBook.testament.toUpperCase()}</p>
              <div className="book-title-line">
                <h1>{selectedBook.name}</h1>
                <button className={isCurrentPlaceBookmarked ? "bookmarked" : ""} onClick={saveReadingPlace} aria-label={`Bookmark ${selectedBook.name} chapter ${chapter}`} title={isCurrentPlaceBookmarked ? "Current reading place saved" : "Save this reading place"}>
                  {isCurrentPlaceBookmarked ? "★" : "☆"}
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
                return (
                  <div key={verse.id} id={`verse-${verse.id}`} className={`verse-row ${isActive ? "reading" : ""} ${isSelected ? "selected" : ""} ${highlightColor ? `highlighted highlight-${highlightColor}` : ""} ${isBatchSelected ? "batch-selected" : ""}`}>
                    <button className="verse-number" onClick={() => toggleVerseSelection(verse.id)} aria-label={`${isBatchSelected ? "Remove" : "Add"} ${verse.reference} ${isBatchSelected ? "from" : "to"} highlight selection`}>{isBatchSelected ? "✓" : verse.id}</button>
                    <p
                      role="button"
                      tabIndex={0}
                      aria-label={`${isActive && isReading ? (isPaused ? "Resume" : "Pause") : "Read"} ${verse.reference}`}
                      onClick={() => handleVersePlayback(verse.id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleVersePlayback(verse.id); }}
                    >
                      {verse.text.split(/(\s+)/).map((token, index) => (
                        /^\s+$/.test(token) ? token : (
                          <button
                            key={`${token}-${index}`}
                            className={`verse-word ${selectedWord && token.replace(/[^A-Za-zÀ-ž'-]/g, "").toLowerCase() === selectedWord.toLowerCase() ? "word-selected" : ""}`}
                            onClick={(event) => { event.stopPropagation(); selectWord(token, verse.id); }}
                            aria-label={`Look up ${token.replace(/[^A-Za-zÀ-ž'-]/g, "")}`}
                          >{token}</button>
                        )
                      ))}
                      {isActive && <span className="speaking-indicator" aria-label={isPaused ? "Reading paused" : "Reading this verse"}><i /><i /><i /></span>}
                    </p>
                    <div className="verse-actions">
                      <button onClick={() => toggleHighlight(verse.id)} aria-label={`Highlight ${verse.reference}`} className={highlightColor ? "active" : ""}>✦</button>
                      <button onClick={() => { setSelectedVerse(verse.id); setOpenVerseMenu(openVerseMenu === verse.id ? null : verse.id); }} aria-label={`Open actions for ${verse.reference}`} aria-expanded={openVerseMenu === verse.id}>•••</button>
                      <button onClick={() => handleVersePlayback(verse.id)} aria-label={`${isActive && isReading ? (isPaused ? "Resume" : "Pause") : "Read from"} ${verse.reference}`}>{isActive && isReading && !isPaused ? "Ⅱ" : "▶"}</button>
                      {openVerseMenu === verse.id && (
                        <div className="verse-action-menu">
                          <div className="verse-menu-heading"><strong>{verse.reference}</strong><button onClick={() => setOpenVerseMenu(null)} aria-label="Close verse menu">×</button></div>
                          <span>Highlight color</span>
                          <div className="verse-color-row">
                            {(["gold", "sage", "blue", "rose"] as HighlightColor[]).map((color) => <button key={color} className={`color-swatch ${color} ${highlightColor === color ? "selected" : ""}`} onClick={() => setVerseHighlight(verse.id, color)} aria-label={`Highlight ${color}`} />)}
                            {highlightColor && <button className="remove-color" onClick={() => setVerseHighlight(verse.id)} aria-label="Remove highlight">Clear</button>}
                          </div>
                          <button className="open-note-action" onClick={() => { setSelectedVerse(verse.id); setStudyTab("notes"); setStudyCollapsed(false); setMobileStudyOpen(true); setOpenVerseMenu(null); }}>⌑ Open note</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedForHighlight.length > 0 && (
            <div className="highlight-toolbar" role="toolbar" aria-label="Highlight selected verses">
              <strong>{selectedForHighlight.length} {selectedForHighlight.length === 1 ? "verse" : "verses"} selected</strong>
              <span>Highlight:</span>
              {(["gold", "sage", "blue", "rose"] as HighlightColor[]).map((color) => <button key={color} className={`color-swatch ${color}`} onClick={() => applyHighlight(color)} aria-label={`Highlight ${color}`} />)}
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

        <aside className={`study-panel ${mobileStudyOpen ? "mobile-open" : ""}`} aria-label="Study tools">
          <button className="study-collapse" onClick={() => setStudyCollapsed(!studyCollapsed)} aria-label={studyCollapsed ? "Open study panel" : "Collapse study panel"}>{studyCollapsed ? "‹" : "›"}</button>
          {studyCollapsed ? (
            <div className="study-rail">
              <button onClick={() => { setStudyCollapsed(false); setStudyTab("commentary"); }} aria-label="Open commentary"><span>¶</span><i>Commentary</i></button>
              <button onClick={() => { setStudyCollapsed(false); setStudyTab("lexicon"); }} aria-label="Open original language"><span>א</span><i>Original language</i></button>
              <button onClick={() => { setStudyCollapsed(false); setStudyTab("notes"); }} aria-label="Open notes"><span>⌑</span><i>Notes</i></button>
            </div>
          ) : (
            <>
              <button className="close-study" onClick={() => setMobileStudyOpen(false)} aria-label="Close study panel">×</button>
              <div className="study-tabs" role="tablist">
                <button className={studyTab === "commentary" ? "active" : ""} onClick={() => setStudyTab("commentary")} role="tab">Commentary</button>
                <button className={studyTab === "lexicon" ? "active" : ""} onClick={() => setStudyTab("lexicon")} role="tab">Original language</button>
                <button className={studyTab === "notes" ? "active" : ""} onClick={() => setStudyTab("notes")} role="tab">Notes</button>
              </div>
              {studyTab === "commentary" ? (
                <div className="study-content">
                  <div className="study-reference"><span>{selected?.reference || `${selectedBook.name} ${chapter}`}</span><small>Public domain</small></div>
                  {commentaryStatus === "loading" ? (
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
                        <p>{activeCommentaryEntry.text}</p>
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
                  {selectedWord && (
                    <div className="word-lookup-card">
                      <span>SELECTED WORD</span>
                      <h3>{selectedWord}</h3>
                      {selectedLookupEntry ? (
                        <div className="lookup-match">
                          <b>{selectedLookupEntry.word}</b>
                          <p>{selectedLookupEntry.transliteration} · {selectedLookupEntry.meaning}</p>
                          <button onClick={() => pronounceOriginal(selectedLookupEntry)}>▶ Hear pronunciation</button>
                        </div>
                      ) : <p>Showing key original-language words for this passage. A full concordance connection can map every selected English word.</p>}
                    </div>
                  )}
                  <div className="lexicon-intro-row"><p className="lexicon-intro">Select a word in the passage or hear these key terms.</p><button onClick={() => readOriginalWords(activeLexicon)}>▶ Read aloud</button></div>
                  <div className="lexicon-list">
                    {activeLexicon.map((entry) => (
                      <div key={entry.number} className="lexicon-card">
                        <span className="hebrew">{entry.word}</span>
                        <span className="transliteration">{entry.transliteration}</span>
                        <span className="strongs">{entry.number}</span>
                        <strong>{entry.meaning}</strong>
                        <small>Pronounced {entry.pronunciation}</small>
                        <button className="pronounce-button" onClick={() => pronounceOriginal(entry)} aria-label={`Hear ${entry.transliteration}`}>▶ Hear</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="study-content notes-tab-content">
                  <div className="study-reference"><span>Notes · {selected?.reference || `${selectedBook.name} ${chapter}`}</span><small>{chapterNotes.length} in this chapter</small></div>
                  <div className="notes-card open">
                    <div className="notes-heading"><span><i>⌑</i> Note for selected verse</span></div>
                    <textarea value={noteValue} onChange={(event) => updateNote(event.target.value)} placeholder="What are you noticing?" aria-label={`Note for ${selected?.reference || "selected verse"}`} />
                    <div className="saved-state"><span>✓ Saved on this device</span><small>{noteValue.length}/500</small></div>
                  </div>
                  {chapterNotes.length > 0 && <div className="chapter-notes-list"><h3>Chapter notes</h3>{chapterNotes.map((verse) => <button key={verse.id} onClick={() => setSelectedVerse(verse.id)}><strong>{verse.reference}</strong><span>{notes[verseKey(verse.id)]}</span></button>)}</div>}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      <button className="mobile-study-button" onClick={() => setMobileStudyOpen(true)}>Study tools</button>

      <section className={`audio-dock ${audioSettingsOpen ? "settings-open" : ""}`} aria-label="Read aloud controls">
        {audioSettingsOpen && (
          <div className="audio-settings-popover">
            <label><span>Voice</span><select value={voiceName || "local"} onChange={(event) => { const value = event.target.value; const next = value === "local" ? bestVoice(sortedVoices)?.name || "" : value; setVoiceName(next); localStorage.setItem("selah-voice", next); }}>
              <option value="local">Installed browser voice{voiceName ? ` · ${voiceName}` : ""}</option>
              <optgroup label="Installed local voices">{sortedVoices.map((voice) => <option key={voice.name} value={voice.name}>{voice.name}{voice.name.toLowerCase().includes("microsoft david") ? " · default" : ""}</option>)}</optgroup>
            </select></label>
            <p className="voice-availability">No API key is required. Selah uses installed browser voices first, and will automatically use saved chapter audio files when you add them under <code>public/audio</code>.</p>
            <p className="voice-availability">{savedAudioChapters.has(chapterAudioKey) ? "Saved audio is available for this chapter." : "No saved audio file found for this chapter yet."}</p>
            <label><span>Speed</span><input type="range" min="0.7" max="1.25" step="0.05" value={rate} onChange={(event) => setRate(Number(event.target.value))} /><strong>{rate.toFixed(2)}×</strong></label>
          </div>
        )}
        <div className="now-reading"><span className="audio-pulse">◖</span><div><small>{isPaused ? "PAUSED" : isReading ? "READING" : "READ ALOUD"}</small><strong>{activeVerse ? `${selectedBook.name} ${chapter}:${activeVerse}` : `${selectedBook.name} ${chapter}`}</strong></div></div>
        <div className="transport">
          <button className="skip-button" aria-label="Previous verse" onClick={() => jumpToVerse(Math.max(verses[0]?.id || 1, (activeVerse || selectedVerse) - 1))}>‹<span>|</span></button>
          {!isReading ? <button className="play-button" onClick={() => startReading()} aria-label="Start read aloud">▶</button> : <button className="play-button" onClick={togglePause} aria-label={isPaused ? "Resume read aloud" : "Pause read aloud"}>{isPaused ? "▶" : "Ⅱ"}</button>}
          <button className="skip-button" aria-label="Next verse" onClick={() => jumpToVerse(Math.min(verses.at(-1)?.id || 1, (activeVerse || selectedVerse) + 1))}><span>|</span>›</button>
          {isReading && <button className="stop-button" onClick={stopReading} aria-label="Stop read aloud">■</button>}
        </div>
        <button className="audio-settings-button" onClick={() => setAudioSettingsOpen(!audioSettingsOpen)} aria-label="Audio voice and speed settings">•••</button>
      </section>
    </main>
  );
}
