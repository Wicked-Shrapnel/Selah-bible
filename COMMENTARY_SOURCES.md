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
interface. Matthew Henry remains the devotional/expository commentary. JFB is
stored locally in the same chapter JSON format and shown directly in the
commentary sidebar. For a fuller background layer, the app also links to
**Adam Clarke's Commentary** at Bible Hub:

- Collection overview: https://ccel.org/j/jfb/jfb/JFB00.htm
- Example book page: https://ccel.org/j/jfb/jfb/JFB01.htm
- Current app behavior: displays the selected chapter in the Historical Context tab
- Locally stored JFB text: public/commentary/jfb
- Clarke overview: https://biblehub.com/commentaries/clarke/
- Clarke example chapter: https://biblehub.com/commentaries/clarke/genesis/1.htm
- Current app behavior: opens the selected chapter in the Background tab

CCEL states that the expanded electronic edition is in the public domain. The
local import preserves source attribution and keeps the commentary text,
verse-range headings, and Scripture references as structured fields. Clarke is
also public domain, but in this app it is used as a direct link so we do not
republish the transcription locally.

JFB is text-only in this app. If a later historical source includes maps,
plates, or diagrams, those should be handled as separate attributed media
assets with their own license review, caption, alt text, and passage mapping.
