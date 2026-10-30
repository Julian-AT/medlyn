ROOT := $(abspath ..)
UV ?= uv
TECTONIC ?= tectonic
UV_CACHE_DIR ?= /private/tmp/medlyn-paper-uv-cache
TECTONIC_CACHE_DIR ?= /private/tmp/medlyn-paper-tectonic-cache
NUMBERS_ARGS ?=

.PHONY: all numbers test clean
all: main.pdf

numbers:
	cd "$(ROOT)/ml" && UV_CACHE_DIR="$(UV_CACHE_DIR)" $(UV) run --no-sync python ../paper/scripts/numbers.py $(NUMBERS_ARGS)

main.pdf: numbers main.tex arxiv.sty refs.bib
	TECTONIC_CACHE_DIR="$(TECTONIC_CACHE_DIR)" $(TECTONIC) --keep-logs main.tex

test:
	cd "$(ROOT)/ml" && UV_CACHE_DIR="$(UV_CACHE_DIR)" $(UV) run --no-sync python -m unittest discover -s ../paper/scripts -p 'test_*.py' -v

clean:
	rm -f main.aux main.bbl main.blg main.log main.out main.synctex.gz
