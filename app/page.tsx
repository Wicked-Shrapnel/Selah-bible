"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Verse = { id: number; reference: string; text: string };
type Book = { name: string; chapters: number; testament: "Old Testament" | "New Testament" };
type Picker = "books" | "chapters" | null;

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

const commentary = {
  title: "Creation begins with God",
  author: "Matthew Henry, abridged",
  text: "The chapter presents creation as ordered, purposeful, and good. Each movement begins with the divine word and leads from unformed emptiness toward a world prepared for life.",
};

const lexicon = [
  { word: "בְּרֵאשִׁית", transliteration: "bərēʾšît", number: "H7225", meaning: "beginning, first, chief" },
  { word: "אֱלֹהִים", transliteration: "ʾĕlōhîm", number: "H430", meaning: "God, divine one" },
  { word: "בָּרָא", transliteration: "bārāʾ", number: "H1254", meaning: "to create, shape" },
];

function bestVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const preferred = ["natural", "neural", "samantha", "daniel", "aria", "guy", "google us english"];
  return english.find((voice) => preferred.some((name) => voice.name.toLowerCase().includes(name))) || english.find((voice) => voice.localService) || english[0] || voices[0];
}

export default function Home() {
  const [selectedBook, setSelectedBook] = useState(books[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>(genesisOne);
  const [picker, setPicker] = useState<Picker>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadNotice, setLoadNotice] = useState("");
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(0.92);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [studyTab, setStudyTab] = useState<"commentary" | "lexicon">("commentary");
  const [studyCollapsed, setStudyCollapsed] = useState(false);
  const [mobileStudyOpen, setMobileStudyOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const cancelled = useRef(false);

  const passageKey = `${selectedBook.name}-${chapter}`;
  const verseKey = (id: number) => `${passageKey}-${id}`;
  const selected = verses.find((verse) => verse.id === selectedVerse) || verses[0];

  useEffect(() => {
    const savedHighlights = localStorage.getItem("selah-highlights-v2");
    const savedNotes = localStorage.getItem("selah-notes-v2");
    if (savedHighlights) setHighlighted(JSON.parse(savedHighlights));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      setVoiceName((current) => current || bestVoice(available)?.name || "");
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
    window.speechSynthesis?.cancel();
    setIsReading(false);
    setActiveVerse(null);
    loadChapter();
    return () => { ignore = true; };
  }, [selectedBook, chapter]);

  const stopReading = useCallback(() => {
    cancelled.current = true;
    window.speechSynthesis?.cancel();
    setIsReading(false);
    setIsPaused(false);
    setActiveVerse(null);
  }, []);

  const speakVerse = useCallback((index: number) => {
    if (!("speechSynthesis" in window) || !verses[index]) {
      setIsReading(false);
      setActiveVerse(null);
      return;
    }
    const verse = verses[index];
    setActiveVerse(verse.id);
    setSelectedVerse(verse.id);
    document.getElementById(`verse-${verse.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.rate = rate;
    utterance.pitch = 0.96;
    const voice = voices.find((item) => item.name === voiceName) || bestVoice(voices);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (!cancelled.current && index + 1 < verses.length) speakVerse(index + 1);
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
  }, [rate, voiceName, voices, verses]);

  const startReading = useCallback((verseId = selectedVerse) => {
    if (!verses.length) return;
    cancelled.current = false;
    window.speechSynthesis.cancel();
    setIsReading(true);
    setIsPaused(false);
    const index = Math.max(0, verses.findIndex((verse) => verse.id === verseId));
    const introduction = new SpeechSynthesisUtterance(`${selectedBook.name}. Chapter ${chapter}.`);
    introduction.rate = rate;
    introduction.pitch = 0.96;
    const voice = voices.find((item) => item.name === voiceName) || bestVoice(voices);
    if (voice) introduction.voice = voice;
    introduction.onend = () => {
      if (!cancelled.current) speakVerse(index);
    };
    window.speechSynthesis.speak(introduction);
  }, [chapter, rate, selectedBook.name, selectedVerse, speakVerse, voiceName, voices, verses]);

  const jumpToVerse = (id: number) => {
    const index = Math.max(0, verses.findIndex((verse) => verse.id === id));
    window.speechSynthesis.cancel();
    cancelled.current = false;
    setIsReading(true);
    setIsPaused(false);
    speakVerse(index);
  };

  const togglePause = () => {
    if (isPaused) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
    setIsPaused(!isPaused);
  };

  const toggleHighlight = (id: number) => {
    const key = verseKey(id);
    const next = highlighted.includes(key) ? highlighted.filter((item) => item !== key) : [...highlighted, key];
    setHighlighted(next);
    localStorage.setItem("selah-highlights-v2", JSON.stringify(next));
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
    setPicker("chapters");
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
  const noteValue = notes[verseKey(selectedVerse)] || "";

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
          <label className="version-select"><span className="sr-only">Bible version</span><select defaultValue="kjv"><option value="kjv">KJV · demo</option><option disabled>NKJV · license required</option></select></label>
          <button className="avatar" aria-label="Profile">BL</button>
        </div>
      </header>

      {picker && (
        <>
          <button className="picker-backdrop" onClick={() => setPicker(null)} aria-label="Close passage picker" />
          <section className={`passage-menu ${picker === "books" ? "book-menu" : "chapter-menu"}`} aria-label={picker === "books" ? "Books of the Bible" : `Chapters in ${selectedBook.name}`}>
            <div className="passage-menu-heading">
              <div><span>{picker === "books" ? "BIBLE" : selectedBook.name.toUpperCase()}</span><h2>{picker === "books" ? "Choose a book" : "Choose a chapter"}</h2></div>
              <button onClick={() => setPicker(null)} aria-label="Close">×</button>
            </div>
            {picker === "books" ? (
              <div className="testament-columns">
                {[{ title: "Old Testament", items: oldTestament }, { title: "New Testament", items: newTestament }].map((group) => (
                  <div key={group.title} className="testament-group">
                    <h3>{group.title}</h3>
                    <div className="book-grid">
                      {group.items.map((book) => <button key={book.name} className={book.name === selectedBook.name ? "selected" : ""} onClick={() => chooseBook(book)}>{book.name}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chapter-grid">
                {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((number) => (
                  <button key={number} className={number === chapter ? "selected" : ""} onClick={() => { setChapter(number); setPicker(null); }}>{number}</button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="license-note"><span>NKJV-ready foundation</span><p>Public-domain KJV text is used until a licensed NKJV provider is connected.</p></section>

      <div className={`workspace ${studyCollapsed ? "study-collapsed" : ""}`}>
        <article className="reader">
          <div className="reader-heading">
            <div>
              <p className="eyebrow">{selectedBook.testament.toUpperCase()}</p>
              <h1>{selectedBook.name}</h1>
              <p className="subtitle">Chapter {chapter}</p>
            </div>
            <div className="chapter-tools"><span>{verses.length ? `${verses.length} verses` : ""}</span></div>
          </div>

          {isLoading ? <div className="chapter-state"><i /><p>Opening {selectedBook.name} {chapter}…</p></div> : loadNotice ? <div className="chapter-state error"><p>{loadNotice}</p></div> : (
            <div className="verse-list" aria-label={`${selectedBook.name} chapter ${chapter}`}>
              {verses.map((verse) => {
                const isActive = activeVerse === verse.id;
                const isSelected = selectedVerse === verse.id;
                const isMarked = highlighted.includes(verseKey(verse.id));
                return (
                  <div key={verse.id} id={`verse-${verse.id}`} className={`verse-row ${isActive ? "reading" : ""} ${isSelected ? "selected" : ""} ${isMarked ? "highlighted" : ""}`} onClick={() => setSelectedVerse(verse.id)}>
                    <button className="verse-number" aria-label={`Select ${verse.reference}`}>{verse.id}</button>
                    <p>{verse.text}{isActive && <span className="speaking-indicator" aria-label="Reading this verse"><i /><i /><i /></span>}</p>
                    <div className="verse-actions">
                      <button onClick={(event) => { event.stopPropagation(); toggleHighlight(verse.id); }} aria-label={`Highlight ${verse.reference}`} className={isMarked ? "active" : ""}>✦</button>
                      <button onClick={(event) => { event.stopPropagation(); setSelectedVerse(verse.id); setStudyCollapsed(false); }} aria-label={`Add note to ${verse.reference}`}>⌑</button>
                      <button onClick={(event) => { event.stopPropagation(); startReading(verse.id); }} aria-label={`Read from ${verse.reference}`}>▶</button>
                    </div>
                  </div>
                );
              })}
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
              <button onClick={() => setStudyCollapsed(false)} aria-label="Open notes"><span>⌑</span><i>Notes</i></button>
            </div>
          ) : (
            <>
              <button className="close-study" onClick={() => setMobileStudyOpen(false)} aria-label="Close study panel">×</button>
              <div className="study-tabs" role="tablist">
                <button className={studyTab === "commentary" ? "active" : ""} onClick={() => setStudyTab("commentary")} role="tab">Commentary</button>
                <button className={studyTab === "lexicon" ? "active" : ""} onClick={() => setStudyTab("lexicon")} role="tab">Original language</button>
              </div>
              {studyTab === "commentary" ? (
                <div className="study-content">
                  <div className="study-reference"><span>{selected?.reference || `${selectedBook.name} ${chapter}`}</span><button aria-label="More commentary options">•••</button></div>
                  <div className="commentary-card">
                    <span className="card-label">CHAPTER OVERVIEW</span><h2>{commentary.title}</h2><p>{commentary.text}</p>
                    <div className="commentary-author"><span>MH</span><div><strong>{commentary.author}</strong><small>Classic commentary collection</small></div></div>
                  </div>
                  <div className="cross-references"><h3>Cross references</h3><button><span>John 1:1–3</span><small>In the beginning was the Word…</small></button><button><span>Hebrews 11:3</span><small>Through faith we understand…</small></button></div>
                </div>
              ) : (
                <div className="study-content">
                  <div className="study-reference"><span>Hebrew · {selected?.reference || `${selectedBook.name} ${chapter}`}</span><button aria-label="More lexicon options">•••</button></div>
                  <p className="lexicon-intro">Explore key words from the opening passage.</p>
                  <div className="lexicon-list">{lexicon.map((entry) => <button key={entry.number} className="lexicon-card"><span className="hebrew">{entry.word}</span><span className="transliteration">{entry.transliteration}</span><span className="strongs">{entry.number}</span><strong>{entry.meaning}</strong></button>)}</div>
                </div>
              )}
              <div className="notes-card open">
                <div className="notes-heading"><span><i>⌑</i> My note · {selected?.reference || `${selectedBook.name} ${chapter}`}</span></div>
                <textarea value={noteValue} onChange={(event) => updateNote(event.target.value)} placeholder="What are you noticing?" aria-label={`Note for ${selected?.reference || "selected verse"}`} />
                <div className="saved-state"><span>✓ Saved on this device</span><small>{noteValue.length}/500</small></div>
              </div>
            </>
          )}
        </aside>
      </div>

      <button className="mobile-study-button" onClick={() => setMobileStudyOpen(true)}>Study tools</button>

      <section className={`audio-dock ${audioSettingsOpen ? "settings-open" : ""}`} aria-label="Read aloud controls">
        {audioSettingsOpen && (
          <div className="audio-settings-popover">
            <label><span>Voice</span><select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>{voices.length === 0 && <option>System voice</option>}{voices.filter((voice) => voice.lang.startsWith("en")).map((voice) => <option key={voice.name} value={voice.name}>{voice.name.replace("Microsoft ", "").replace("Google ", "")}</option>)}</select></label>
            <label><span>Speed</span><input type="range" min="0.7" max="1.25" step="0.05" value={rate} onChange={(event) => setRate(Number(event.target.value))} /><strong>{rate.toFixed(2)}×</strong></label>
          </div>
        )}
        <div className="now-reading"><span className="audio-pulse">◖</span><div><small>{isReading ? "READING" : "READ ALOUD"}</small><strong>{activeVerse ? `${selectedBook.name} ${chapter}:${activeVerse}` : `${selectedBook.name} ${chapter}`}</strong></div></div>
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
