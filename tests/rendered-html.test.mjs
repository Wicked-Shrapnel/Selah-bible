import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Selah Bible reader", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Selah — Scripture, slowly<\/title>/i);
  assert.match(html, /Genesis/);
  assert.match(html, /Commentary/);
  assert.match(html, /Original language/);
  assert.match(html, /Notes/);
  assert.match(html, /Add Genesis 1:1 to section selection/);
  assert.match(html, /Open highlight and note tools for Genesis 1:1/);
  assert.match(html, /Collapse read aloud controls/);
  assert.match(html, /Bookmark Genesis chapter 1/);
  assert.match(html, />KJV</);
  assert.doesNotMatch(html, /NKJV|license required|NKJV-ready foundation/i);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("ships the attributed whole-Bible commentary dataset", async () => {
  const [manifestText, genesisText, sourceNotes] = await Promise.all([
    readFile(new URL("../public/commentary/mhcc/manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../public/commentary/mhcc/genesis/1.json", import.meta.url), "utf8"),
    readFile(new URL("../COMMENTARY_SOURCES.md", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const genesis = JSON.parse(genesisText);

  assert.equal(manifest.source.author, "Matthew Henry");
  assert.equal(manifest.source.license, "Public Domain");
  assert.equal(manifest.chapterCount, 1189);
  assert.equal(manifest.entryCount, 4047);
  assert.deepEqual(manifest.source.mediaTypes, []);
  assert.equal(genesis.entries[0].verseStart, 1);
  assert.equal(genesis.entries[0].verseEnd, 2);
  assert.match(genesis.entries[0].text, /first verse of the Bible/i);
  assert.match(sourceNotes, /maps, photographs, charts, or\s+illustrations/i);
});

test("bundles local Bible files and red-letter metadata", async () => {
  const [booksText, genesisText, redLetterText] = await Promise.all([
    readFile(new URL("../public/bible/kjv/Books.json", import.meta.url), "utf8"),
    readFile(new URL("../public/bible/kjv/Genesis.json", import.meta.url), "utf8"),
    readFile(new URL("../public/bible/kjv/red-letter.json", import.meta.url), "utf8"),
  ]);

  const books = JSON.parse(booksText);
  const genesis = JSON.parse(genesisText);
  const redLetter = JSON.parse(redLetterText);

  assert.equal(books.length, 66);
  assert.equal(genesis.book, "Genesis");
  assert.equal(genesis.chapters[0].verses[0].text, "In the beginning God created the heaven and the earth.");
  assert.ok(redLetter["John 3:16"]);
  assert.ok(redLetter["Matthew 5:3"]);
});

test("bundles word-level Hebrew and Greek lookup data", async () => {
  const [genesisText, johnText, hebrewText, greekText, sourceNotes] = await Promise.all([
    readFile(new URL("../public/original-language/kjv/Genesis.json", import.meta.url), "utf8"),
    readFile(new URL("../public/original-language/kjv/John.json", import.meta.url), "utf8"),
    readFile(new URL("../public/original-language/kjv/hebrew.json", import.meta.url), "utf8"),
    readFile(new URL("../public/original-language/kjv/greek.json", import.meta.url), "utf8"),
    readFile(new URL("../public/original-language/kjv/README.txt", import.meta.url), "utf8"),
  ]);
  const genesis = JSON.parse(genesisText);
  const john = JSON.parse(johnText);
  const hebrew = JSON.parse(hebrewText);
  const greek = JSON.parse(greekText);

  assert.deepEqual(genesis.verses["1:1"][2].strongs, ["H7225"]);
  assert.equal(hebrew.H7225.lemma, "רֵאשִׁית");
  assert.ok(john.verses["1:1"].some((word) => word.strongs?.includes("G3056")));
  assert.equal(greek.G3056.lemma, "λόγος");
  assert.match(sourceNotes, /CrossWire Bible Society KJV 3\.1/);
  assert.match(sourceNotes, /Open Scriptures/);
});

test("includes searchable passage selection, saved place, and commentary audio", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /placeholder="Search for a book/);
  assert.match(page, /selah-reading-place-v1/);
  assert.match(page, /setPicker\("chapters"\)/);
  assert.match(page, /chapter-dropdown/);
  assert.match(page, /toggleReadingPlace/);
  assert.match(page, /floating-chapter-navigation/);
  assert.match(page, /inline-note-editor/);
  assert.match(page, /inlineSectionNoteIds/);
  assert.match(page, /saved-note-indicator/);
  assert.match(page, /Press ✓ to save this note/);
  assert.match(page, /formatNoteReference/);
  assert.match(page, /closeMenusOnOutsideClick/);
  assert.match(page, /savedViewTab/);
  assert.match(page, /saved-bookmark-card/);
  assert.match(page, /SAVED SECTION/);
  assert.match(page, /aria-label="Saved library sections"/);
  assert.match(page, /savedVerseText/);
  assert.match(page, /excerptText/);
  assert.match(page, /saved-read-aloud/);
  assert.match(page, /Highlights · newest first/);
  assert.doesNotMatch(page, /\{color\} highlight/);
  assert.match(page, /selah-highlight-color/);
  assert.match(page, /selah-audio-dock-collapsed/);
  assert.match(page, /Official audio Bible/);
  assert.match(page, /davidVoice/);
  assert.match(page, /selah-audio-source/);
  assert.match(page, /audioSourcePreference/);
  assert.match(page, /Automatic - David only for now/);
  assert.match(page, /Microsoft David/);
  assert.match(page, /disabled right now/);
  assert.doesNotMatch(page, /selah-enabled-voices/);
  assert.doesNotMatch(page, /toggleVoiceVisibility/);
  assert.doesNotMatch(page, /voice-picker-panel/);
  assert.match(page, /settings-window/);
  assert.match(page, /selah-theme/);
  assert.match(page, /themePreference/);
  assert.match(page, /Green dark/);
  assert.match(page, /True dark/);
  assert.match(page, /selah-study-panel-width-v1/);
  assert.match(page, /startStudyResize/);
  assert.match(page, /study-resize-handle/);
  assert.match(page, /selah-read-original-definition/);
  assert.match(page, /new SpeechSynthesisUtterance\(entry\.meaning\)/);
  assert.doesNotMatch(page, /Definition\. \$\{entry\.meaning\}/);
  assert.doesNotMatch(page, /visibleVoices/);
  assert.match(page, /readingSession/);
  assert.match(page, /chapterMp3AudioPath/);
  assert.match(page, /playSavedChapterAudio/);
  assert.match(page, /chapterAudioFiles/);
  assert.match(page, /verseWordCount/);
  assert.match(page, /toggleCommentaryReading/);
  assert.match(page, /studyPanelRef/);
  assert.match(page, /panel\.scrollTo\(\{ top: Math\.max\(0, targetTop\), behavior: "smooth" \}\)/);
  assert.match(page, /Read commentary aloud/);
  assert.match(page, /Add section note/);
  assert.match(page, /audioDockCollapsed/);
  assert.match(page, /utterance\.onboundary/);
  assert.match(page, /commentary-spoken-word/);
  assert.match(page, /Historical Context/);
  assert.match(page, /Cambridge Bible for Schools and Colleges/);
  assert.match(page, /historicalCommentaryUrl/);
  assert.match(page, /future side-by-side media view/);
  assert.match(page, /wordStudyMode/);
  assert.match(page, /originalLanguageBookCache/);
  assert.match(page, /selectedOriginalEntries/);
  assert.match(page, /Hear \{entry\.transliteration/);
  assert.match(page, /loadBibleChapter/);
  assert.match(page, /bible\/kjv\/red-letter\.json/);
  assert.doesNotMatch(page, /recentWords|RECENT WORDS/);
  assert.match(page, /id === sorted\[0\] - 1/);
  assert.doesNotMatch(page, /bible-api\.com/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /:root\[data-theme="true-dark"\]/);
  assert.match(styles, /--study-panel-width/);
  assert.match(styles, /cursor: col-resize/);
  assert.match(styles, /audio-source-summary/);
  assert.match(styles, /speed-control/);
  assert.match(styles, /\.study-panel \{ position: sticky; top: 72px;/);
});
