//Author Ben Jones (benjones@cs.utah.edu)

//tests should be runnable either by opening test.html (must be running in a web server since CORS blocks loading js from files)
//or with a commandline runner: brew install v8; d8 --module test.js

import { Token, InvalidToken, Lexer } from '../modules/lexer.js';
import {
	ArithmeticExpression,
	AssignmentStatement,
	FunctionDef,
	IfStatement,
	Parser,
	ReturnStatement,
	VarDeclaration,
	WhileStatement
} from '../modules/parser.js';
import { analyze } from '../modules/semantic.js';
import { assemble } from '../modules/backend.js';

function test(name, code) {
	try {
		console.log('running ', name);
		code();
		console.log(name, ' passed');
	} catch (error) {
		console.log(name, 'failed: ', error);
		console.log(error.stack);
	}
}

function assert(cond) {
	if (!cond) {
		throw new Error();
	}
}

function arraysEqual(a, b) {
	if (a.length != b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] != b[i]) {
			return false;
		}
	}
	return true;
}

/****** LEXER TESTS *****/

test('lexing delimiters', () => {
	let lexer = new Lexer(`{(}   
        +   ;  -`);
	let tokens = Array.from(lexer);
	let tokenString = tokens.map((x) => x.value).join('');
	assert(tokenString == '{(}+;-');
	for (let i = 0; i < 3; i++) {
		assert(tokens[i].line == 1);
		assert(tokens[i].col == i + 1);
	}
	for (let i = 3; i < tokens.length; i++) {
		assert(tokens[i].line == 2);
	}
});

test('lexing literals', () => {
	let lexer = new Lexer(`1234
    5678`);
	// for(let token of lexer){
	//     console.log(token);
	// }
	let tokens = Array.from(lexer);
	let values = tokens.map((x) => x.value);
	assert(arraysEqual(values, [1234, 5678]));
	assert(tokens[0].line == 1);
	assert(tokens[0].col == 1);
	assert(tokens[1].line == 2);
	assert(tokens[1].col == 5);
});

test('logic ops', () => {
	let lexer = new Lexer(`< > <= >=
    != =
    <
    !
    <`); //'!' is invalid token
	// for(let token of lexer){
	//     console.log(token);
	// }
	let tokens = Array.from(lexer);
	let values = tokens.map((x) => x.value);

	assert(arraysEqual(values, ['<', '>', '<=', '>=', '!=', '=', '<', '!', '<']));
	assert(tokens[0].col == 1);
	assert(tokens[3].line == 1);
	assert(tokens[3].col == 8);
	assert(tokens[4].line == 2);
	assert((tokens[4].col = 5));
	assert(tokens[5].line == 2);
	assert(tokens[5].col == 8);
	assert(tokens[7] instanceof InvalidToken);
	assert(tokens[8] instanceof Token);
});

test('words', () => {
	let lexer = new Lexer(`void int hello while
    if else`); //'!' is invalid token
	let tokens = Array.from(lexer);
	let values = tokens.map((x) => x.value);
	assert(arraysEqual(values, ['void', 'int', 'hello', 'while', 'if', 'else']));
	assert(tokens[0].line == 1);
	assert(tokens[2].line == 1);
	assert(tokens[3].line == 1);
	assert(tokens[4].line == 2);
	assert(tokens[5].line == 2);

	assert(tokens[1].col == 6);
	assert(tokens[4].col == 5);
	assert(tokens[5].col == 8);
});

test('mixed lexing', () => {
	let lexer = new Lexer(`void function(int x, int y){
        int z = 3;
        int y = 5;
        return y+z;
    }`);
	let tokens = Array.from(lexer);
	let values = tokens.map((x) => x.value);
	assert(
		arraysEqual(values, [
			'void',
			'function',
			'(',
			'int',
			'x',
			',',
			'int',
			'y',
			')',
			'{',
			'int',
			'z',
			'=',
			3,
			';',
			'int',
			'y',
			'=',
			5,
			';',
			'return',
			'y',
			'+',
			'z',
			';',
			'}'
		])
	);
});

/***** PARSER TESTS *****/

test('empty function def', () => {
	let parser = new Parser(`int aName(){
    }`);
	let func = parser.parseFunction();
	assert(func instanceof FunctionDef);
	//console.log(JSON.stringify(func));
	assert(func.name == 'aName');
	assert(func.parameters.length == 0);
	assert(func.body.length == 0);
});

test('func with parameters', () => {
	let parser = new Parser(`int aName(int x,
        int y, int z){
    }`);
	let func = parser.parseFunction();
	assert(func instanceof FunctionDef);
	//console.log(JSON.stringify(func));
	assert(func.name == 'aName');
	assert(func.parameters.length == 3);
	assert(func.body.length == 0);
	assert(
		arraysEqual(
			func.parameters.map((x) => x.value),
			['x', 'y', 'z']
		)
	);
});

test('func with body', () => {
	let parser = new Parser(`int aName(){
        int x = 0;
        if(x < 3){} else {}
        while(3 > x){}
        return x + 3;
    }`);
	let func = parser.parseFunction();
	assert(func instanceof FunctionDef);
	//console.log(JSON.stringify(func));
	assert(func.name == 'aName');
	assert(func.parameters.length == 0);
	assert(func.body.length == 4);
	assert(func.body[0] instanceof VarDeclaration);
	assert(func.body[1] instanceof IfStatement);
	assert(func.body[2] instanceof WhileStatement);
	assert(func.body[3] instanceof ReturnStatement);
});

test('func compound expression', () => {
	let parser = new Parser(`int func(int x, int y, int z){
        int b = 1;
        b = b + x + y;
        return x + y + z + 3 + -b;
    }`);
	let func = parser.parseFunction();
	assert(func instanceof FunctionDef);
	//console.log(JSON.stringify(func));
	assert(func.name == 'func');
	assert(func.parameters.length == 3);
	assert(func.body.length == 3);
	assert(func.body[0] instanceof VarDeclaration);
	assert(func.body[1] instanceof AssignmentStatement);
	assert(func.body[2] instanceof ReturnStatement);
	assert(func.body[1].lhs.value == 'b');
	assert(func.body[1].expr.lhs.name == 'b');
	assert(func.body[1].expr.op.value == '+');
	assert(func.body[1].expr.rhs instanceof ArithmeticExpression);

	//not testing EVERYTHING, but a pretty good subset here
});

//error handling
test('missing semicolons', () => {
	let parser = new Parser(`int func(int x,){
        int b = 1
        b = b + x;
        if(b > 0){
            b = b + 2
        }
        return b;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
});

test('invalid tokens', () => {
	let parser = new Parser(`int func(int x,){
        int b = 3;
        b = b * 4;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
});

/****** analysis tests *****/

test('basic analysis with errors', () => {
	let parser = new Parser(`int func(int x, int y){
        int z = 3;
        x = y + z + 3;
        q = 3;
        y = x - 3;
        z = x + a;
    }`);
	let func = parser.parseFunction();
	let ret = analyze(func);
	console.log(ret.scope.toString());
	console.log(JSON.stringify(ret.errors));
	assert(ret.errors.length == 2);
	assert(ret.errors[0].startLine == 4);
	assert(ret.errors[1].startLine == 6);
});

test('analysis including if/while', () => {
	let parser = new Parser(`int func(int x, int y){
        while(x > 0){
            x = x - 1;
        }
        if(y > 1){
            y = y + x;
        }
        return y;
    }`);
	let func = parser.parseFunction();
	let ret = analyze(func);
	console.log(ret.scope.toString());
	console.log(JSON.stringify(ret.errors));
});

test('analyze nested scopes', () => {
	let parser = new Parser(`int func(int x, int y){
        int q = 2;
        if(x > 0){
            int z = 3;
            x = y + z;
        } else {
            int z = 1;
            x = y - z;
            int q = 2;
        }

        while(q > 0){
            q = q - 1;
        }
        return x;
    }`);
	let func = parser.parseFunction();
	let ret = analyze(func);
	console.log(ret.scope.toString());
	console.log(JSON.stringify(ret.errors));
});

/***** ASSEMBLY TESTS ******/

test('basic assembly test', () => {
	let parser = new Parser(`int func(int x, int y){
        int z = 3;
        x = 2;
        y = x + z;
        x = y - 2;
        x = -x;
        return x;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
	let ret = analyze(func);
	assert(ret.errors.length == 0);
	let asm = assemble(func);
	console.log('asm:');
	console.log(asm.toString());
});

test('if statement combos', () => {
	let parser = new Parser(`int func(int x, int y){
        if(x == y){
            x = x + 1;
        }

        int z = 2;
        if(z != x){
            y = 3;
        } else {
            y = 4;
        }
        if(x < y){
            x = 5;
        }
        if(x > y){
            x = 6;
        }
        if(x <= y){
            x = 7;
        }
        if(x >= y){
            x = 8;
        }
        return x + y;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
	let ret = analyze(func);
	assert(ret.errors.length == 0);
	let asm = assemble(func);
	console.log('asm:');
	console.log(asm.toString());
});

test('while loop types', () => {
	let parser = new Parser(`int func(int x, int y){
        while( x == y) {
            x = x + 1;
        }
        while( x != y){
            x = x - 1;
        }
        while(x > y){
            x = x - 1;
        }
        while(x < y){
            x = x + 1;
        }
        while(x >= y){
            x = x - 1;
        }
        while(x <= y){
            x = x + 1;
        }
        return x;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
	let ret = analyze(func);
	assert(ret.errors.length == 0);
	let asm = assemble(func);
	console.log('asm:');
	console.log(asm.toString());
});

test('test nesting', () => {
	let parser = new Parser(`int func(int x, int y){
        if(x < y){
            int i = 0;
            while(i < 3){
                x = x + 1;
            }
        }
        return x;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
	let ret = analyze(func);
	assert(ret.errors.length == 0);
	let asm = assemble(func);
	console.log('asm:');
	console.log(asm.toString());
});

//todo while loop with conditions like (x + 1 ) < (y + 2)
//to make sure those are recomputed on each iteration

//optimizer tests

test('basic optimizer test', () => {
	let parser = new Parser(`int func(int x, int y){
        int z = 3;
        x = 2;
        y = x + z;
        x = 2 - y;
        x = -x;
        return x;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
	let ret = analyze(func);
	assert(ret.errors.length == 0);
	let asm = assemble(func);
	console.log('asm:');
	console.log(asm.toString());
	asm.optimize();
	console.log('\nafter optimizing');
	console.log(asm.toString());
});

test('test nesting with optimizer', () => {
	let parser = new Parser(`int func(int x, int y){
        if(x < y){
            int i = 0;
            while(i < 3){
                x = x + 1;
            }
        }
        return x;
    }`);
	let func = parser.parseFunction();
	console.log(JSON.stringify(func));
	let ret = analyze(func);
	assert(ret.errors.length == 0);
	let asm = assemble(func);
	console.log('asm:');
	let asStr = asm.toString();
	console.log(asStr);
	console.log(asStr.split('\n').length, ' lines');
	asm.optimize();
	console.log('\nafter optimizing');
	asStr = asm.toString();
	console.log(asStr);
	console.log(asStr.split('\n').length, ' lines');
});
