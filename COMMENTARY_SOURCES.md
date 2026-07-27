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

The app also presents **Jamieson-Fausset-Brown Commentary**
(`Commentary Critical and Explanatory on the Whole Bible`, 1871) as a separate
historical-context source. The edition is public domain and is used for
historical, literary, and interpretive notes.

The historical source is intentionally separated from Matthew Henry in the
interface. Matthew Henry remains the locally stored devotional/expository
commentary. JFB is linked chapter-by-chapter to the public-domain
transcription hosted by CCEL:

- Collection overview: https://ccel.org/j/jfb/jfb/JFB00.htm
- Example book page: https://ccel.org/j/jfb/jfb/JFB01.htm
- Current app behavior: links to the selected book in the source edition
- Locally stored JFB text: none

CCEL states that the expanded electronic edition is in the public domain, so
the app can link to it directly without re-publishing the transcription. A
structured local edition can later be connected through the same source view
without changing the reader interface.

JFB is text-only in this app. If a later historical source includes maps,
plates, or diagrams, those should be handled as separate attributed media
assets with their own license review, caption, alt text, and passage mapping.
