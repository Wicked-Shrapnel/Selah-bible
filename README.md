# Selah-bible
A King James Bible web app designed to help the user meditate on God's word by helping them to understand not only the English, but the original languages of the Old and New Testament.

This has been done using chat GPT codecs.

(Still a work in progress)

The inspiration for the project was two things. I love the YouVersion mobile app, and you honestly can't do much better than that for a day-to-day Bible reading app. It does not have built in commentary. But there are Bible plans that you can read and listen to But they're not baked into the entire Bible itself. Unless you find a specific plan That spans The entire bible. There's a seemingly unlimited amount of Bible plans and every Bible translation you could possibly want to read, for better or for worse. The actual web app is serviceable, but it's a bit clunky for my tastes. And I tend to listen when I read. And a couple years ago they used to do verse highlighting that would allow you to follow along as you listen. But they recently removed it. And have a audio player open up in a Separate tab as you listen.

I hope this project blesses you. It's been fun working on it. And if there's any suggestions, I would love to hear them.

## Core features

- Multiple theme support Green Dark, True Dark, and light.
- Read aloud capability across the whole application.
- Verse highlighting in multiple colors.
![[Pasted image 20260728125850.png]]

- Inline note taking

- ![[Pasted image 20260728125353.png]]
  Built in commentary panel for each chapter (Matthew Henry’s Concise Commentary on the Whole Bible)

![[Pasted image 20260728130621.png]]
Read aloud with diverse highlighted.
Original language panel that allows the user to select individual words and will read and pronounce the word in the original language. Disclaimer this feature in particular I would caution against using one hundred percent. I am by no means a linguist. So make sure to double check any information that comes from this feature.

Whole Bible keyword search (Still needs to be refined.)
![[Pasted image 20260728132045.png]]

## Quick setup guide

1. Install Node.js 22.13.0 or newer.
2. Unzip the source folder somewhere on your computer.
3. Open a terminal in that folder.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the local URL it prints.

## Version 2.0 release notes

Added Bible search
Added additional themes.
added a saved section for highlighted verses as well as notes.
Added two additional historically-based commentaries.
Added a commentary info panel.
Added the functionality to hyperlink any scripture references in the commentary and allow the user to jump to them.
Added a section to allow the user to import their own audio if it is presented chapter by chapter and allows the user to hear that audio in the app itself.

Note: the app does not ship with a proper audio bible that has a better reading voice than The Microsoft TTS voices. But if I find one, give the user the option, download it, and plug it into the app,
I also added the function to check for updates against the most recent repo.

## General UI enhancements and tweaks

- You can now enlarge the commentary window.
- I also added pagination for the multiple sections for each commentary piece in the chapter.
- Fixed most of the issues with some of the themes having problems with certain types of text being

## known bugs

- There's a known issue with the pencil icon when trying to highlight a verse in true dark, green dark theme. The colors are not shown when selecting. The user's chosen highlight color, but once it is selected, the color is shown.
