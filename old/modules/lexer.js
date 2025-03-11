//Author Ben Jones (benjones@cs.utah.edu)

export class Token {
	constructor(value, line, col, index) {
		this.value = value;
		this.line = line;
		this.col = col;
		this.index = index; //index of last char of this token
	}
}

export class InvalidToken {
	constructor(value, line, col, index) {
		this.value = value;
		this.line = line;
		this.col = col;
		this.index = index; //index of last char of this token
	}
}

export let delimiters = new Set(['(', ')', '{', '}', ';', ',']);
export let arithmeticOps = new Set(['+', '-']);
export let logicOps = new Set(['>', '<', '>=', '<=', '==', '!=']);
export let EOF = Symbol.for('End of File');

//Expose the lexer as an iterable so you can, for example,
//loop over tokens in the stream with a foreach loop
export class Lexer {
	#src;
	constructor(src) {
		this.#src = src;
	}

	//lex next token
	[Symbol.iterator]() {
		let line = 1;
		let col = 1;
		let index = 0;
		let logicChars = new Set(['<', '>', '=', '!']);
		let whitespace = new Set([' ', '\t', '\n']);
		return {
			// Note: using an arrow function allows `this` to point to the
			// one of `[@@iterator]()` instead of `next()`
			next: () => {
				let currentChar = () => this.#src[index];
				let hasMore = () => index < this.#src.length;
				let token = (value) => new Token(value, line, col, index);

				let parseIntLiteral = () => {
					let startLine = line;
					let startCol = col;
					let startIndex = index;
					while (isDigit(currentChar())) {
						col++;
						index++;
					}
					let value = parseInt(this.#src.substring(startIndex, index));
					return new Token(value, startLine, startCol, index - 1);
				};

				let parseWord = () => {
					let startLine = line;
					let startCol = col;
					let startIndex = index;
					while (hasMore() && isWordChar(currentChar())) {
						++col;
						++index;
					}
					let retVal = this.#src.substring(startIndex, index);
					return new Token(retVal, startLine, startCol, index - 1);
				};

				//skip whitespace
				while (true) {
					if (currentChar() == ' ') {
						col++;
					} else if (currentChar() == '\t') {
						col += 4;
					} else if (currentChar() == '\n') {
						col = 1;
						line++;
					} else {
						break;
					}
					index++;
				}

				if (!hasMore()) {
					//I think things like Array.from will ignore this since done is true,
					//but calling next directly lets you inspect it?
					return { value: new InvalidToken(EOF, line, col, index), done: true };
				}

				//console.log("skipped white space.  Line: ", line, " col ", col, " curChar: ", currentChar());

				if (isDigit(currentChar())) {
					return { value: parseIntLiteral(), done: false };
				} else if (delimiters.has(currentChar()) || arithmeticOps.has(currentChar())) {
					let retVal = currentChar();
					let ret = { value: token(retVal), done: false };
					index++;
					col++;
					return ret;
				} else if (logicChars.has(currentChar())) {
					//logic op or assignment, possibly 2 characters
					let retVal = currentChar();
					let startLine = line;
					let startCol = col;
					++index;
					++col;
					if (retVal == '<' || retVal == '>' || retVal == '!' || retVal == '=') {
						if (currentChar() == '=') {
							++index;
							++col;
							retVal += '=';
						} //otherwise the single char version
					}
					if (retVal == '!') {
						return { value: new InvalidToken(retVal, startLine, startCol, index - 1), done: false };
					}
					return { value: new Token(retVal, startLine, startCol, index - 1), done: false };
				} else if (isWordChar(currentChar())) {
					return { value: parseWord(), done: false };
				} else {
					let ch = currentChar();
					let retLine = line;
					let retCol = col;
					++index;
					++col;
					return { value: new InvalidToken(ch, retLine, retCol, index - 1), done: false };
				}
			}
		};
	}
}

function isDigit(ch) {
	return ch >= '0' && ch <= '9';
}

function isWordChar(ch) {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_' || isDigit(ch);
}
