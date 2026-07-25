# Commentary sources

## Current source

The app uses **Matthew Henry's Concise Commentary on the Whole Bible**, from
CrossWire Bible Society's MHCC SWORD module, version 2.0 (2021-02-14).

- Coverage: all 66 books, organized by verse or verse range
- License: public domain
- Stored content: commentary prose, verse-range headings, and Scripture references
- Media in this edition: none
- Provenance: https://crosswire.org/sword/modules/ModInfo.jsp?modName=MHCC

CrossWire says this edition matches the Moody Press 28th printing and that
roughly 1,200 errors in an earlier electronic copy were corrected.

The module supplies standalone commentary text for 1,187 of the Bible's 1,189
chapters. Leviticus 19 and Psalm 108 are link-only records in the SWORD module,
so the current web import leaves those two chapter files present but empty
rather than inventing or silently duplicating commentary.

## Content model and future media

The imported JSON records the source metadata, verse range, commentary text,
and linked Scripture references separately. It also declares `mediaTypes`, an
empty list for this text-only source.

If a later licensed source includes maps, photographs, charts, or
illustrations, add media as separate attributed assets rather than embedding
them inside commentary prose. Each asset should carry its own title, caption,
alt text, credit, license, source URL, passage coverage, and display type.
Maps should additionally record geographic bounds and whether they are static
images or interactive layers. Image and map licensing must be reviewed
independently from the commentary text license.

## Historical context source

The app also presents **The Cambridge Bible for Schools and Colleges** as a
separate historical-context source. The collection was published by Cambridge
University Press from 1878 to 1922 and contains historical background,
literary analysis, original-language observations, outlines, maps, plates,
diagrams, and verse-by-verse notes.

The historical source is intentionally separated from Matthew Henry in the
interface. Matthew Henry remains the locally stored devotional/expository
commentary. Cambridge is linked chapter-by-chapter to the transcription hosted
by Bible Hub:

- Collection overview: https://biblehub.com/commentaries/cambridge/
- Content profile: https://www.logos.com/product/8544/cambridge-bible-for-schools-and-colleges
- Current app behavior: links to the selected chapter at the source
- Locally stored Cambridge text: none

Bible Hub states that its transcription is provided courtesy of
BibleSupport.com and is used by permission. That permission is not represented
as transferable to this app, so the app does not scrape, proxy, cache, or
re-publish that transcription. An authorized structured edition can later be
connected through the same source view without changing the reader interface.

Cambridge maps, plates, and diagrams are reserved for a future optional
side-by-side media view. They will not be inserted into the commentary prose.
Every media asset will require its own attribution, license review, caption,
alt text, and passage mapping.
