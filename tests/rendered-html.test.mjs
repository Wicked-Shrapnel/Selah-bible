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

test("includes searchable passage selection, saved place, and commentary audio", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
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
  assert.match(page, /selah-highlight-color/);
  assert.match(page, /selah-audio-dock-collapsed/);
  assert.match(page, /toggleCommentaryReading/);
  assert.match(page, /Read commentary aloud/);
  assert.match(page, /Add section note/);
  assert.match(page, /audioDockCollapsed/);
  assert.match(page, /utterance\.onboundary/);
  assert.match(page, /commentary-spoken-word/);
  assert.match(page, /wordStudyMode/);
  assert.doesNotMatch(page, /recentWords|RECENT WORDS/);
  assert.match(page, /id === sorted\[0\] - 1/);
});
