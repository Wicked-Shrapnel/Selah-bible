"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Verse = {
  id: number;
  reference: string;
  text: string;
};

const verses: Verse[] = [
  { id: 1, reference: "Genesis 1:1", text: "In the beginning God created the heaven and the earth." },
  { id: 2, reference: "Genesis 1:2", text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters." },
  { id: 3, reference: "Genesis 1:3", text: "And God said, Let there be light: and there was light." },
  { id: 4, reference: "Genesis 1:4", text: "And God saw the light, that it was good: and God divided the light from the darkness." },
  { id: 5, reference: "Genesis 1:5", text: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day." },
  { id: 6, reference: "Genesis 1:6", text: "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters." },
];

const commentary = {
  1: {
    title: "Creation begins with God",
    author: "Matthew Henry, abridged",
    text: "The first verse gives us a foundation for faith: the world is not self-made. Its order, beauty, and being proceed from the will of its Creator.",
  },
  2: {
    title: "The Spirit over the waters",
    author: "Study note",
    text: "The opening scene moves from unformed emptiness toward ordered life. The Spirit’s presence signals that creation is an intentional, divine work.",
  },
  3: {
    title: "The power of the word",
    author: "Study note",
    text: "God’s speech is effective: he speaks, and reality responds. Light becomes the first named movement from disorder toward a habitable world.",
  },
};

const lexicon = [
  { word: "בְּרֵאשִׁית", transliteration: "bərēʾšît", number: "H7225", meaning: "beginning, first, chief", note: "A beginning point or first phase." },
  { word: "אֱלֹהִים", transliteration: "ʾĕlōhîm", number: "H430", meaning: "God, divine one", note: "The common Hebrew title for God." },
  { word: "בָּרָא", transliteration: "bārāʾ", number: "H1254", meaning: "to create, shape", note: "Used here of divine creative activity." },
];

function bestVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const preferred = ["natural", "neural", "samantha", "daniel", "aria", "guy", "google us english"];
  return (
    english.find((voice) => preferred.some((name) => voice.name.toLowerCase().includes(name))) ||
    english.find((voice) => voice.localService) ||
    english[0] ||
    voices[0]
  );
}

export default function Home() {
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(0.92);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [highlighted, setHighlighted] = useState<number[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [studyTab, setStudyTab] = useState<"commentary" | "lexicon">("commentary");
  const [notesOpen, setNotesOpen] = useState(true);
  const [mobileStudyOpen, setMobileStudyOpen] = useState(false);
  const readIndex = useRef(0);
  const cancelled = useRef(false);

  useEffect(() => {
    const savedHighlights = localStorage.getItem("selah-highlights");
    const savedNotes = localStorage.getItem("selah-notes");
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

  const stopReading = useCallback(() => {
    cancelled.current = true;
    window.speechSynthesis?.cancel();
    setIsReading(false);
    setIsPaused(false);
    setActiveVerse(null);
  }, []);

  const speakFrom = useCallback((index: number) => {
    if (!("speechSynthesis" in window) || !verses[index]) {
      setIsReading(false);
      setActiveVerse(null);
      return;
    }
    readIndex.current = index;
    const verse = verses[index];
    setActiveVerse(verse.id);
    setSelectedVerse(verse.id);
    const utterance = new SpeechSynthesisUtterance(`${verse.reference}. ${verse.text}`);
    utterance.rate = rate;
    utterance.pitch = 0.96;
    const selectedVoice = voices.find((voice) => voice.name === voiceName) || bestVoice(voices);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onend = () => {
      if (!cancelled.current && index + 1 < verses.length) speakFrom(index + 1);
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
  }, [rate, voiceName, voices]);

  const startReading = useCallback((verseId = selectedVerse) => {
    cancelled.current = false;
    window.speechSynthesis.cancel();
    setIsReading(true);
    setIsPaused(false);
    speakFrom(Math.max(0, verses.findIndex((verse) => verse.id === verseId)));
  }, [selectedVerse, speakFrom]);

  const togglePause = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const toggleHighlight = (id: number) => {
    const next = highlighted.includes(id) ? highlighted.filter((item) => item !== id) : [...highlighted, id];
    setHighlighted(next);
    localStorage.setItem("selah-highlights", JSON.stringify(next));
  };

  const updateNote = (id: number, value: string) => {
    const next = { ...notes, [id]: value };
    setNotes(next);
    localStorage.setItem("selah-notes", JSON.stringify(next));
  };

  const selected = useMemo(() => verses.find((verse) => verse.id === selectedVerse) || verses[0], [selectedVerse]);
  const selectedCommentary = commentary[selectedVerse as keyof typeof commentary] || {
    title: "The shape of creation",
    author: "Study note",
    text: "The passage continues to describe God bringing distinction, purpose, and order into creation through his spoken word.",
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Selah</strong>
            <span>Scripture, slowly</span>
          </div>
        </div>

        <div className="passage-picker" aria-label="Current passage">
          <button className="book-button">Genesis <span>⌄</span></button>
          <div className="divider" />
          <button className="chapter-button"><span>‹</span> Chapter 1 <span>›</span></button>
        </div>

        <div className="header-actions">
          <label className="version-select">
            <span className="sr-only">Bible version</span>
            <select defaultValue="kjv">
              <option value="kjv">KJV · demo text</option>
              <option value="nkjv" disabled>NKJV · license connection</option>
            </select>
          </label>
          <button className="icon-button" aria-label="Search">⌕</button>
          <button className="avatar" aria-label="Profile">BL</button>
        </div>
      </header>

      <section className="license-note">
        <span>NKJV-ready foundation</span>
        <p>This prototype uses public-domain KJV text. Connect a licensed NKJV provider before launch.</p>
        <button aria-label="Dismiss licensing note">×</button>
      </section>

      <div className="workspace">
        <article className="reader">
          <div className="reader-heading">
            <div>
              <p className="eyebrow">THE FIRST BOOK OF MOSES</p>
              <h1>Genesis</h1>
              <p className="subtitle">The Creation</p>
            </div>
            <div className="chapter-tools">
              <button aria-label="Decrease text size">A−</button>
              <button aria-label="Increase text size">A+</button>
              <button aria-label="Reading settings">☼</button>
            </div>
          </div>

          <div className="verse-list" aria-label="Genesis chapter 1">
            {verses.map((verse) => {
              const isActive = activeVerse === verse.id;
              const isSelected = selectedVerse === verse.id;
              const isMarked = highlighted.includes(verse.id);
              return (
                <div
                  key={verse.id}
                  id={`verse-${verse.id}`}
                  className={`verse-row ${isActive ? "reading" : ""} ${isSelected ? "selected" : ""} ${isMarked ? "highlighted" : ""}`}
                  onClick={() => setSelectedVerse(verse.id)}
                >
                  <button className="verse-number" aria-label={`Select ${verse.reference}`}>{verse.id}</button>
                  <p>
                    {verse.text}
                    {isActive && <span className="speaking-indicator" aria-label="Reading this verse"><i /><i /><i /></span>}
                  </p>
                  <div className="verse-actions">
                    <button onClick={(event) => { event.stopPropagation(); toggleHighlight(verse.id); }} aria-label={`Highlight ${verse.reference}`} className={isMarked ? "active" : ""}>✦</button>
                    <button onClick={(event) => { event.stopPropagation(); setSelectedVerse(verse.id); setNotesOpen(true); }} aria-label={`Add note to ${verse.reference}`}>⌑</button>
                    <button onClick={(event) => { event.stopPropagation(); startReading(verse.id); }} aria-label={`Read ${verse.reference}`}>▶</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chapter-end">
            <span />
            <p>End of sample passage</p>
            <span />
          </div>
        </article>

        <aside className={`study-panel ${mobileStudyOpen ? "mobile-open" : ""}`}>
          <button className="close-study" onClick={() => setMobileStudyOpen(false)} aria-label="Close study panel">×</button>
          <div className="study-tabs" role="tablist">
            <button className={studyTab === "commentary" ? "active" : ""} onClick={() => setStudyTab("commentary")} role="tab">Commentary</button>
            <button className={studyTab === "lexicon" ? "active" : ""} onClick={() => setStudyTab("lexicon")} role="tab">Original language</button>
          </div>

          {studyTab === "commentary" ? (
            <div className="study-content">
              <div className="study-reference"><span>{selected.reference}</span><button aria-label="More commentary options">•••</button></div>
              <div className="commentary-card">
                <span className="card-label">OVERVIEW</span>
                <h2>{selectedCommentary.title}</h2>
                <p>{selectedCommentary.text}</p>
                <div className="commentary-author"><span>MH</span><div><strong>{selectedCommentary.author}</strong><small>Classic commentary collection</small></div></div>
              </div>
              <div className="cross-references">
                <h3>Cross references</h3>
                <button><span>John 1:1–3</span><small>In the beginning was the Word…</small></button>
                <button><span>Hebrews 11:3</span><small>Through faith we understand…</small></button>
              </div>
            </div>
          ) : (
            <div className="study-content">
              <div className="study-reference"><span>Hebrew · {selected.reference}</span><button aria-label="More lexicon options">•••</button></div>
              <p className="lexicon-intro">Select a word to explore its root, pronunciation, and range of meaning.</p>
              <div className="lexicon-list">
                {lexicon.map((entry) => (
                  <button key={entry.number} className="lexicon-card">
                    <span className="hebrew">{entry.word}</span>
                    <span className="transliteration">{entry.transliteration}</span>
                    <span className="strongs">{entry.number}</span>
                    <strong>{entry.meaning}</strong>
                    <small>{entry.note}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`notes-card ${notesOpen ? "open" : ""}`}>
            <button className="notes-heading" onClick={() => setNotesOpen(!notesOpen)}>
              <span><i>⌑</i> My note · {selected.reference}</span><span>{notesOpen ? "−" : "+"}</span>
            </button>
            {notesOpen && (
              <>
                <textarea
                  value={notes[selectedVerse] || ""}
                  onChange={(event) => updateNote(selectedVerse, event.target.value)}
                  placeholder="What are you noticing?"
                  aria-label={`Note for ${selected.reference}`}
                />
                <div className="saved-state"><span>✓ Saved on this device</span><small>{(notes[selectedVerse] || "").length}/500</small></div>
              </>
            )}
          </div>
        </aside>
      </div>

      <button className="mobile-study-button" onClick={() => setMobileStudyOpen(true)}>Study tools</button>

      <section className="audio-dock" aria-label="Read aloud controls">
        <div className="now-reading">
          <div className="audio-icon"><span>◖</span></div>
          <div><small>{isReading ? "NOW READING" : "READY TO READ"}</small><strong>{activeVerse ? `Genesis 1:${activeVerse}` : selected.reference}</strong></div>
        </div>

        <div className="transport">
          <button
            aria-label="Previous verse"
            onClick={() => {
              const id = Math.max(1, (activeVerse || selectedVerse) - 1);
              setSelectedVerse(id);
              if (isReading) startReading(id);
            }}
          >|‹</button>
          {!isReading ? (
            <button className="play-button" onClick={() => startReading()} aria-label="Start read aloud">▶</button>
          ) : (
            <button className="play-button" onClick={togglePause} aria-label={isPaused ? "Resume read aloud" : "Pause read aloud"}>{isPaused ? "▶" : "Ⅱ"}</button>
          )}
          <button
            aria-label="Next verse"
            onClick={() => {
              const id = Math.min(verses.length, (activeVerse || selectedVerse) + 1);
              setSelectedVerse(id);
              if (isReading) startReading(id);
            }}
          >›|</button>
          {isReading && <button className="stop-button" onClick={stopReading} aria-label="Stop read aloud">■</button>}
        </div>

        <div className="audio-settings">
          <label>
            <span>Voice</span>
            <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
              {voices.length === 0 && <option>System voice</option>}
              {voices.filter((voice) => voice.lang.startsWith("en")).map((voice) => <option key={voice.name} value={voice.name}>{voice.name.replace("Microsoft ", "").replace("Google ", "")}</option>)}
            </select>
          </label>
          <label className="speed-control">
            <span>Speed</span>
            <input type="range" min="0.7" max="1.25" step="0.05" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
            <strong>{rate.toFixed(2)}×</strong>
          </label>
        </div>
      </section>
    </main>
  );
}
