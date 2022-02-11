![image](https://user-images.githubusercontent.com/44904628/153615541-ddd54ca1-aed6-4834-9ea6-d785691f4ea6.png)


BeyondPlayer (originally called Source Player) is an open source video player for English learner. It supports almost all common video types and playback functionalities.

What makes it unique is its dedicated features for English study, such as:

-   View definition in pop-up dictionary
-   Drag and select to loop lines
-   Save video clip to clip library
-   Highly configurable web dictionaries
-   YouTube player and browser
-   Collect word to word book and word list
-   Blur out hardcoded subtitle
-   Automatically hide subtitle
-   Automatically download subtitles

See [Product Page](https://circleapps.co/) or [BeyondPlayer Wiki](https://github.com/circleapps/beyondplayer/wiki) for more about this app.

For the moment, it supports MacOS only, but I hope it will support Windows soon.

---

# Install

```
make sure you have nodejs (12.x) and yarn installed.
cd {PROJECT_ROOT}/scripts
./install_mpvjs.sh
```

# Debug

```
cd {PROJECT_ROOT}/src
npm run dev
```

Then Press F5 in Visual Studio Code

# Build

## Dev Build

```
cd {PROJECT_ROOT}/scripts
./build_dev.sh
```

---

# License

BeyondPlayer is based on [mpv.js](https://github.com/Kagami/mpv.js/) and [Electron](https://electronjs.org/), for complete open source softwares used by this app, see
[Open Source Software Attribution](https://github.com/circleapps/sourceplayer/wiki/Open-Source-Software-Attribution)

---

# Acknowlegement

BeyondPlayer leveraged [OpenSubtitle API](https://opensubtitles.org) for subtitle searching and downloading.
