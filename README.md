![BeyondPlayer](https://circleapps.co/img/screenshots/popup.png)


BeyondPlayer (originally called Source Player) is a video player for English learner. It supports almost all common video types and playback functionalities.

What makes it unique is its dedicated features for English study, such as:

* View definition in pop-up dictionary
* Drag and select to loop lines
* Save video clip to clip library
* Highly configurable web dictionaries
* YouTube player and browser 
* Collect word to word book and word list
* Blur out hardcoded subtitle 
* Automatically hide subtitle 
* Automatically download subtitles
 

See [Product Page](https://circleapps.co/) or [BeyondPlayer Wiki](https://github.com/circleapps/beyondplayer/wiki) for more about this app.

------



# Release Notes

## 2.0.0

1. Changed app name from “Source Player” to BeyondPlayer Pro, changed app icon.
2. Added Chinese localizations.
3. Added clip library. You can extract video clip with lines from movie to clip library.
4. Small user interface refinements.
5. Bugfix.
6. Added video tutorial in help menu.

## 1.3.0

1. Automatic word notification by annotating word with the definition from local or web dictionary.
2. More convenient way to select text in the subtitle at the bottom of video player.
3. After downloading the first subtitle, the remain subtitles will be downloaded in background.
4. Add keyboard shortcuts to change loop range.
5. Minor UI changes and improvements.
6. Bugfix.

## 1.2.9 and 1.2.8

1. Fixed an issue where subtitle does not get updated when application window is not focused.
2. Fixed a subtitle display issue for YouTube player when network is slow.

## 1.2.7

1. Added support to allow changing subtitle language in YouTube player.
2. Added support for second subtitle in YouTube player.
3. Fixed an issue where after the application window is maximized then restored, some buttons in the side panel are not clickable.
4. Improve the default YouTube playback method, all videos can be opened successfully. The Google video stream playback method is dropped, since it is not needed anymore.
5. Fixed an issue where Russian and Korean subtitles are not properly displayed.
6. Fixed a few usability issues.

## 1.2.5

1. Restored macOS 10.11 support
2. Added word count for word list
3. Fixed a bug of displaying sentences related to a word

## 1.2.4

1. Fixed crash when subtitle contains a special word.
2. Avoid scrolling when user hits spacebar in subtitle panel.

## 1.2.2

### Improvements
1. Redesign player UI
2. Support displaying second subtitle
3. Allow downloading subtitle other than English language
4. YouTube: support maximized view for YouTube browser, you can browse YouTube videos in the same way as you browse YouTube in a web browser
5. YouTube: add another playback method for YouTube player 
6. Block screensaver while playing 
7. Lots of bugfixes and small improvements

### Changes
1. Add back "recently files" in application menu
2. Drop support for macOS 10.10 due to the limitation of third-party component
3. Drop support for macOS 10.11 due to the limitation of third-party component, may add it back once we find a solution

-----


# License

BeyondPlayer is based on [mpv.js](https://github.com/Kagami/mpv.js/) and [Electron](https://electronjs.org/), for complete open source softwares used by this app, see
[Open Source Software Attribution](https://github.com/circleapps/sourceplayer/wiki/Open-Source-Software-Attribution)

-----

# Acknowlegement

BeyondPlayer leveraged [OpenSubtitle API](https://opensubtitles.org) for subtitle searching and downloading.

