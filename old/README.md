# Compiler + Assembler for CS 1810 (formerly CS 1030)

This repo contains tools adapted from versions by Joe Zachary for writing code to run on the "Simple Computer" simulator.

Current versions are all JS that run in a simple web UI. The compiler was written by Ben Jones based on the design of Peter Marheine who wrote a Rust version.

The Assembler was written by Minwei Shen and modified by Ben Jones

You can access this "running" at benjones.github.io/rccjs

To run your own version, just clone this repo into a webserver and point students at index.html

## What's in here?

All the major functionality is in the modules folder

- lexer: which should probably be called tokenizer splits a string into tokens
- parser: builds a lexer from a string and tries to parse a function definition (the reduced C language can just have a single function definition)
- semantic: Does some delayed checks on the AST like making sure the return type/return statements match, making sure there's no duplicate variable declarations, etc
- backend: produces assembly from a function definition
- assembler: Converts assembly to machine code

The test folder has a simple "unit test" runner which can be invoked either from the commandline, or by opening the test.html file and looking at the JS console in the browser

Students should be pointed to index.html which is an interactive page where they can edit reduced C, see the compiled/assembled output, and edit the assembly as necessary.

## Todos:

- Automate testing of asm/code gen, probably by writing a VM of the simplecomputer that runs in the browser. Might be useful for other purposes too...
- Better error highlighting in the student facing page (now highlights entire lines, ignoring columns)
- Warning when the machine code is > 32 bytes which is the size of the SC address space
- The parser/semantic analyzer is more permissive than the grammar, I think
