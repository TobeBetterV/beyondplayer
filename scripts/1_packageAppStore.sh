#!/bin/bash

mkdir ../build/pkg/

if [[ $1 == "lite" ]] ; then
    echo "lite version!"
    APP="BeyondPlayer Lite"
    APP_PATH="../build/mas/BeyondPlayer Lite-mas-x64/BeyondPlayer Lite.app"
    PARENT_PLIST="./lite.parent.plist"
else
    APP="BeyondPlayer Pro"
    APP_PATH="../build/mas/BeyondPlayer Pro-mas-x64/BeyondPlayer Pro.app"
    PARENT_PLIST="./parent.plist"
fi

LIB_PATH="$APP_PATH/Contents/Resources/app.asar.unpacked/node_modules/mpv.js/build/Release"
NODE_MODULES_PATH="$APP_PATH/Contents/Resources/app.asar.unpacked/node_modules"
RES_PATH="$APP_PATH/Contents/Resources"
# The path to the location you want to put the signed package.
RESULT_PATH="../build/pkg/$APP.pkg"
# The name of certificates you requested.
APP_KEY="3rd Party Mac Developer Application: Wei Liao (G9SLV5C872)"
INSTALLER_KEY="3rd Party Mac Developer Installer: Wei Liao (G9SLV5C872)"
# The path of your plist files.
CHILD_PLIST="./child.plist"
LOGINHELPER_PLIST="./loginhelper.plist"

 
FRAMEWORKS_PATH="$APP_PATH/Contents/Frameworks"


xattr -cr "$APP_PATH"
plutil -insert ElectronTeamID -string "G9SLV5C872" "$APP_PATH/Contents/Info.plist"
plutil -replace LSMinimumSystemVersion -string "10.11.0" "$APP_PATH/Contents/Info.plist"


if [[ $1 == "lite" ]] ; then
    echo "lite version!"
    cp embeddedlite.provisionprofile "$APP_PATH/Contents/embedded.provisionprofile"
else
    cp embedded.provisionprofile "$APP_PATH/Contents/"
fi
 
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Electron Framework"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib"
#codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Libraries/libnode.dylib"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper.app/Contents/MacOS/$APP Helper"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper.app/"
#codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper EH.app/Contents/MacOS/$APP Helper EH"
#codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper EH.app/"
#codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper NP.app/Contents/MacOS/$APP Helper NP"
#codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper NP.app/"
codesign -s "$APP_KEY" -f --entitlements "$LOGINHELPER_PLIST" "$APP_PATH/Contents/Library/LoginItems/$APP Login Helper.app/Contents/MacOS/$APP Login Helper"
codesign -s "$APP_KEY" -f --entitlements "$LOGINHELPER_PLIST" "$APP_PATH/Contents/Library/LoginItems/$APP Login Helper.app/"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$APP_PATH/Contents/MacOS/$APP"

if [[ $1 != "lite" ]] ; then
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$APP_PATH/Contents/Resources/app.asar.unpacked/etc/lookup/osx-lookup"
fi


echo "$APP_PATH"

echo "-------------------- start codesign  ------------------------"

for entry in "$LIB_PATH"/*
do
    echo "$entry" 
    codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$entry"
    #codesign -s "F0A60EEFB5AAF1F2A7A795E44277C4975D60FFE1" --timestamp=none -f --entitlements "$CHILD_PLIST" "$entry"

    #electron-osx-sign "$APP_PATH" "$entry"
    echo ""
done

echo "-------------------- start clean resources  ------------------------"

for entry in "$RES_PATH"/*
do
    echo "$entry"
    if  [[ $entry == *lproj ]] ; then
        echo "$entry is lproj"
        if  [[ $entry != *en.lproj ]] && [[ $entry != *zh_CN.lproj ]] && [[ $entry != *zh_TW.lproj ]] ; then
            rm -rf "$entry"
        fi
    fi
done

echo "-------------------- start clean node_modules  ------------------------"
for entry in "$NODE_MODULES_PATH"/*
do
    echo "$entry"
    if  [[ $entry != *mpv.js ]] && [[ $entry != *electron-log ]] && [[ $entry != *get-src ]] && [[ $entry != *get-video-id ]] ; then
        echo "remove $entry"
        rm -rf "$entry"
    fi
done

rm -rf "$NODE_MODULES_PATH/.cache"



codesign -s "$APP_KEY" -f --entitlements "$PARENT_PLIST" "$APP_PATH"

productbuild --component "$APP_PATH" /Applications --sign "$INSTALLER_KEY" "$RESULT_PATH"