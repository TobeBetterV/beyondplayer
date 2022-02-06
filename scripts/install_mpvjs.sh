cd ../src 
rm -rf node_modules
npm install
cd ../scripts
cp -r dist/* ../src/node_modules/mpv.js/build/Release/
install_name_tool -change /usr/local/opt/mpv/lib/libmpv.1.dylib '@loader_path/libmpv.1.dylib' ../src/node_modules/mpv.js/build/Release/mpvjs.node