# Get first defined flex-sdk location, in order preference given
FLEX := $(wordlist 1,1,$(wildcard 		\
	/Applications/flex_sdk_4.5.1.21328  \
	/Applications/flex_sdk*  \
	/opt/flex-sdk))

AMXMLC := ${FLEX}/bin/amxmlc
MXMLC := ${FLEX}/bin/mxmlc
LOCALE := en_US
FXSIZE := -default-size 256 256
FXFRAMERATE := -default-frame-rate 62
FXBGCOLOR := -default-background-color 0xFFFFFF
FXLIB := -library-path+=${FLEX}/frameworks/locale/${LOCALE} -library-path+=${FLEX}/frameworks/libs/ -library-path+=${FLEX}/frameworks/libs/air
FXSRC := -source-path+=${FLEX}/frameworks/locale/${LOCALE}
FXLOCALE := -locale=${LOCALE}
FXOTHER := -incremental=false -strict=true -use-network=true -target-player=9

FXFLAGS := ${FXSIZE} ${FXFRAMERATE} ${FXBGCOLOR} ${FXOTHER} ${FXLIB} ${FXSRC} ${FXLOCALE}

PROGNAME := twod
PROGLIB := ./lib
PROGSRC := ./src
PROGEXT := ./ext
PROGBUILD := ./build
PROGDEPLOY := ../bin
PROGMAIN := ${PROGSRC}/Main.as
PROGOUTPUT := ${PROGBUILD}/twod.swf
PROGFLAGS := -library-path+=${PROGLIB} -source-path+=${PROGSRC} -source-path+=${PROGEXT} -output ${PROGOUTPUT}

DEPLOY := cp -rf ${PROGBUILD}/* ${PROGDEPLOY}

ifdef FLEX
default: all
else
default:
	@echo Flex not available, skipping flash build
endif

.PHONY: all flash install

all: flash install

install: 
	${DEPLOY}

flash:
	${AMXMLC} ${FXFLAGS} ${PROGFLAGS} ${PROGMAIN}
