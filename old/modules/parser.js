//Author Ben Jones (benjones@cs.utah.edu)

import { arithmeticOps, delimiters, InvalidToken, logicOps, Lexer, EOF } from './lexer.js';
import { IterBuffer } from './iterBuffer.js';

//syntax elements
export class ASTNode {
	constructor(startLine, startCol, endLine, endCol) {
		this.startLine = startLine;
		this.startCol = startCol;
		this.endLine = endLine;
		this.endCol = endCol;
	}
}

export class ParseError extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, reason) {
		super(startLine, startCol, endLine, endCol);
		this.reason = reason;
	}
}

export class LiteralExpression extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, value) {
		super(startLine, startCol, endLine, endCol);
		this.value = value;
	}
}

export class VariableExpression extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, name) {
		super(startLine, startCol, endLine, endCol);
		this.name = name;
	}
}

export class NegationExpression extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, expr) {
		super(startLine, startCol, endLine, endCol);
		this.expr = expr;
	}
}

export class ArithmeticExpression extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, lhs, op, rhs) {
		super(startLine, startCol, endLine, endCol);
		this.lhs = lhs;
		this.op = op;
		this.rhs = rhs;
	}
}

export class ConditionExpression extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, lhs, op, rhs) {
		super(startLine, startCol, endLine, endCol);
		this.lhs = lhs;
		this.op = op;
		this.rhs = rhs;
	}
}

export class FunctionDef extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, retType, name, parameters, body) {
		super(startLine, startCol, endLine, endCol);
		this.retType = retType;
		this.name = name;
		this.parameters = parameters;
		this.body = body;
	}
}

export class VarDeclaration extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, name, value) {
		super(startLine, startCol, endLine, endCol);
		this.name = name;
		this.value = value;
	}
}

export class IfStatement extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, cond, thenStatements, elseStatements) {
		super(startLine, startCol, endLine, endCol);
		this.cond = cond;
		this.thenStatements = thenStatements;
		this.elseStatements = elseStatements;
	}
}

export class WhileStatement extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, cond, body) {
		super(startLine, startCol, endLine, endCol);
		this.cond = cond;
		this.body = body;
	}
}

export class ReturnStatement extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, expr) {
		super(startLine, startCol, endLine, endCol);
		this.expr = expr;
	}
}

export class AssignmentStatement extends ASTNode {
	constructor(startLine, startCol, endLine, endCol, lhs, expr) {
		super(startLine, startCol, endLine, endCol);
		this.lhs = lhs;
		this.expr = expr;
	}
}

let keywords = new Set(['int', 'void', 'if', 'while', 'else', 'return']);

export class Parser {
	#tokens;
	#input;
	constructor(input) {
		this.#input = input;
		let lexer = new Lexer(input);
		this.#tokens = new IterBuffer(lexer[Symbol.iterator]());
		//        console.log(this.#iter);
	}

	//return the advance to the next token and return it
	#nextToken() {
		//value will be InvalidToken with "end of file"
		//when we're out of tokens,
		return this.#tokens.next().value;
	}
	//return what will be returned by the next call to next, but don't advance the stream
	#peekToken() {
		return this.#tokens.peek().value;
	}

	#prevToken() {
		return this.#tokens.prev().value;
	}

	#hasMoreTokens() {
		return this.#peekToken().value != EOF;
	}

	// ERROR HANDLING/REPORTING
	/*
        Current thinking: statement parsers should catch any thrown errors and return them
        basically propagation stops there and the statment gets parsed as an error
        parseFunction also wraps stuff in try/catch since it's the entry point so nothing escapes
        if there are syntax errors in the function itself

        More testing is needed to be sure this is a good idea...
    */

	parseFunction() {
		try {
			let retType = this.#expect(new Set(['int', 'void']));
			let token = this.#nextToken();
			let name = token.value;
			if (!validIdentifier(name)) {
				throw new ParseError(
					token.line,
					token.col,
					token.line,
					token.line + name.length,
					'invalid function name: ' + name
				);
			}
			let parameters = this.#parseParameters();

			this.#expect('{');
			let body = this.#parseStatements();
			let endCurly = this.#expect('}');
			return new FunctionDef(
				retType.line,
				retType.col,
				endCurly.line,
				endCurly.col,
				Symbol.for(retType.value),
				name,
				parameters,
				body
			);
		} catch (parseError) {
			//console.log("parse error, todo, better diagnostics");
			//console.log(parseError.stack);
			return parseError;
		}
	}

	#parseParameters() {
		this.#expect('(');
		let parameters = [];
		//console.log("peeking for params: ", this.#peekToken().value);
		while (this.#hasMoreTokens() && this.#peekToken().value != ')') {
			//parse parameters
			this.#expect('int');
			let idTok = this.#nextToken();

			//do this check in a pass over the syntax tree so we can try to parse as much
			//before erroring out
			// if (!validIdentifier(idTok.value)) {
			//     throw new ParseError(token.line, token.col, token.line, token.line + name.length,
			//         "invalid parameter name: " + name);
			// }

			//no need to store types since they're all ints,
			//but keep the whole token for future error reporting on name reuse
			parameters.push(idTok);

			if (this.#peekToken().value == ',') {
				//TODO, THIS ALLOWS TRAILING ,
				this.#nextToken();
			} else if (this.#peekToken().value != ')') {
				let next = this.#nextToken();
				throw new ParseError(
					next.line,
					next.col,
					next.line,
					next.col + next.value.length,
					"Expecting ',' or ')' in function paramter list, not " + name
				);
			}
		}
		this.#expect(')');

		return parameters;
	}

	//we've already grabbed the '{' so next token will be the first thing inside
	//doing that so that parseFunction can grab the } and use it to set the end location
	#parseStatements() {
		let statements = [];
		//console.log("peeking for params: ", this.#peekToken().value);
		while (this.#hasMoreTokens() && this.#peekToken().value != '}') {
			let peekedToken = this.#peekToken();
			if (peekedToken instanceof InvalidToken) {
				statements.push(
					new ParseError(
						peekedToken.line,
						peekedToken.col,
						peekedToken.line,
						peekedToken.col + peekedToken.value.length,
						'Invalid Token: ' + peekedToken.value
					)
				);
				this.#nextToken();
				continue;
			}
			let peeked = peekedToken.value;
			if (peeked == 'int') {
				statements.push(this.#parseDeclaration());
			} else if (peeked == 'if' || peeked == 'while') {
				statements.push(this.#parseIfOrWhileStatement());
			} else if (peeked == 'return') {
				statements.push(this.#parseReturnStatement());
			} else {
				statements.push(this.#parseAssignmentStatement());
			}
		}
		return statements;
	}

	#parseDeclaration() {
		//        console.log("parsing declaration");
		try {
			let typeToken = this.#expect('int');
			let idToken = this.#nextToken();
			//check the name in a later step
			this.#expect('=');
			let expression = this.#parseSimpleExpression(); //should be int, check that later
			let semi = this.#expect(';');

			return new VarDeclaration(
				typeToken.line,
				typeToken.col,
				semi.line,
				semi.col,
				idToken,
				expression
			);
		} catch (parseError) {
			return parseError;
		}
	}
	#parseIfOrWhileStatement() {
		try {
			let keywordToken = this.#expect(new Set(['if', 'while']));
			this.#expect('(');
			let cond = this.#parseCondition();
			this.#expect(')');
			this.#expect('{');
			let body = this.#parseStatements();
			let closeCurly = this.#expect('}');
			if (keywordToken.value == 'if') {
				let elseStatements = [];
				if (this.#peekToken().value == 'else') {
					this.#expect('else');
					this.#expect('{');
					elseStatements = this.#parseStatements();
					closeCurly = this.#expect('}');
				}
				return new IfStatement(
					keywordToken.line,
					keywordToken.col,
					closeCurly.line,
					closeCurly.col,
					cond,
					body,
					elseStatements
				);
			} else {
				return new WhileStatement(
					keywordToken.line,
					keywordToken.col,
					closeCurly.line,
					closeCurly.col,
					cond,
					body
				);
			}
		} catch (parseError) {
			return parseError;
		}
	}

	#parseReturnStatement() {
		try {
			let keyword = this.#expect('return');
			let expr = this.#parseExpression();
			let semi = this.#expect(';');
			//todo errors?
			return new ReturnStatement(keyword.line, keyword.col, semi.line, semi.col, expr);
		} catch (parseError) {
			return parseError;
		}
	}
	#parseAssignmentStatement() {
		try {
			let lhs = this.#nextToken(); //should be a var name
			this.#expect('=');
			let rhs = this.#parseExpression();
			let semi = this.#expect(';');
			return new AssignmentStatement(lhs.line, lhs.col, semi.line, semi.col, lhs, rhs);
		} catch (parseError) {
			return parseError;
		}
	}

	#parseExpression() {
		//could be a simpleExpression, exp + exp,  exp - exp, -exp
		let peek = this.#peekToken().value;
		//        console.log("parse expression, peeked token: ", peek);
		if (peek == '-') {
			let minus = this.#nextToken();
			let expr = this.#parseExpression();
			return new NegationExpression(minus.line, minus.col, expr.endLine, expr.endCol, expr);
		}

		let first = this.#parseSimpleExpression();
		let next = this.#peekToken().value;
		if (next == '+' || next == '-') {
			let op = this.#expect(arithmeticOps);
			let rhs = this.#parseExpression();
			return new ArithmeticExpression(
				first.startLine,
				first.startCol,
				rhs.endLine,
				rhs.endCol,
				first,
				op,
				rhs
			);
		} else {
			return first;
		}
	}

	//variable or literal
	#parseSimpleExpression() {
		let token = this.#nextToken();
		if (typeof token.value == 'number') {
			//            console.log("simple expr for ", token.value, " is number");
			return new LiteralExpression(
				token.line,
				token.col,
				token.line,
				token.col + token.value.toString().length,
				token.value
			);
		} else if (validIdentifier(token.value)) {
			//            console.log("simple expr for ", token.value, " is identifier");
			return new VariableExpression(
				token.line,
				token.col,
				token.line,
				token.col + token.value.length,
				token.value
			);
		} else {
			return new ParseError(
				token.line,
				token.col,
				token.line,
				token.col + token.value.length,
				'expecting number or variable'
			);
		}
	}

	//boolean expression
	#parseCondition() {
		let lhs = this.#parseSimpleExpression();
		let op = this.#nextToken();
		let rhs = this.#parseSimpleExpression();
		//toString because rhs could be a number, if it's a var, it should be a no-op
		if (!logicOps.has(op.value)) {
			return new ParseError(
				lhs.startLine,
				lhs.startCol,
				rhs.endLine,
				rhs.endCol,
				'invalid comparison operator: ' + op.value
			);
		}
		return new ConditionExpression(
			lhs.startLine,
			lhs.startCol,
			rhs.endLine,
			rhs.endCol,
			lhs,
			op,
			rhs
		);
	}

	#expect(options) {
		let ok = (val) => {
			if (options instanceof Set) {
				return options.has(val);
			} else {
				return options == val;
			}
		};
		let token = this.#peekToken(); //peek here for the ';' heuristic below
		//console.log("expecting: ", (options instanceof Set) ? Array.from(options).join(', ') : options);
		//console.log("token.value: ", token.value);
		if (!(token instanceof InvalidToken) && ok(token.value)) {
			return this.#nextToken();
		} else {
			let expected =
				options instanceof Set
					? 'One of ' +
						Array.from(options)
							.map((x) => '"' + x.toString() + '"')
							.join(', ')
					: '"' + options.toString() + '"';
			let got =
				token instanceof InvalidToken
					? token.value == EOF
						? 'end of file'
						: 'Invalid Token: ' + token.value
					: token.value;

			let extra = '';
			if (
				options == ';' &&
				!(this.#prevToken() instanceof InvalidToken) &&
				this.#prevToken().line != token.line
			) {
				extra = '\nMaybe you forgot a semicolon at the end of a line?';
			} else {
				this.#nextToken();
			}

			throw new ParseError(
				token.line,
				token.col,
				token.line,
				token.col + token.value.length,
				'expected ' + expected + ' but got ' + got + extra
			);
		}
	}
}

export function validIdentifier(name) {
	return !(
		delimiters.has(name) ||
		arithmeticOps.has(name) ||
		logicOps.has(name) ||
		keywords.has(name) ||
		typeof name == 'number'
	);
}
