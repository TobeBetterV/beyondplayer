change_deps() {
  local dep=$1
  local depname=$(basename $dep)
  echo $depname
  # [[ -e dist/$depname ]] || install -m755 $dep dist
  otool -L $dep | awk '/\/usr\/local.*\.dylib /{print $1}' | while read lib; do
    local libname=$(basename $lib)
    [[ $depname = $libname ]] && continue
    echo $libname
    install_name_tool -change $lib @loader_path/$libname dist/$depname
    # [[ -e dist/$libname ]] && continue
    # install -m755 $lib dist
  done
}

change_deps $1