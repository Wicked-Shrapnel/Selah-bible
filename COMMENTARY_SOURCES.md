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
