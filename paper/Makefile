ROOT := $(abspath ..)
UV ?= uv
TECTONIC ?= tectonic
UV_CACHE_DIR ?= /private/tmp/medlyn-paper-uv-cache
TECTONIC_CACHE_DIR ?= /private/tmp/medlyn-paper-tectonic-cache
NUMBERS_ARGS ?= --include-heldout
FIGURES := $(wildcard figures/*.tex)

.PHONY: all numbers lint test clean
all: main.pdf

numbers:
	cd "$(ROOT)/ml" && UV_CACHE_DIR="$(UV_CACHE_DIR)" $(UV) run --no-sync python ../paper/scripts/numbers.py $(NUMBERS_ARGS)

lint:
	cd "$(ROOT)/ml" && UV_CACHE_DIR="$(UV_CACHE_DIR)" $(UV) run --no-sync python ../paper/scripts/lint_prose.py

main.pdf: numbers lint main.tex arxiv.sty refs.bib $(FIGURES)
	TECTONIC_CACHE_DIR="$(TECTONIC_CACHE_DIR)" $(TECTONIC) --keep-logs main.tex

test:
	cd "$(ROOT)/ml" && UV_CACHE_DIR="$(UV_CACHE_DIR)" $(UV) run --no-sync python -m unittest discover -s ../paper/scripts -p 'test_*.py' -v

clean:
	rm -f main.aux main.bbl main.blg main.log main.out main.synctex.gz
