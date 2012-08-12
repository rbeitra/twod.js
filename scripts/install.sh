#!/bin/sh

mkdir -p lib || exit 1

ext=src/external
cat \
  $ext/jquery-1.7.js \
  $ext/jquery.create.js \
  $ext/modernizr-2.0.6.min.js \
  $ext/underscore.js \
  $ext/swfobject.js \
  $ext/RequestAnimationFrame.js \
  $ext/Stats.js \
  $ext/gl-matrix.js \
  $ext/webgl-debug.js \
  $ext/GLU.js \
  src/twod.js \
    > lib/twod.js || exit 1

# build minified version 
uglifyjs lib/twod.js > lib/twod.min.js || exit 1

# build flash
make -Cflash

# vim:ts=2 sw=2
