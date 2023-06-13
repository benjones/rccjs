//tests should be runnable either by opening test.html (must be running in a web server since CORS blocks loading js from files)
//or with a commandline runner: brew install v8; d8 --module test.js

import {Token, InvalidToken, Lexer} from '../modules/lexer.js';
import {FunctionDef, Parser} from '../modules/parser.js';
function test(name, code){
    try {
        console.log('running ', name);
        code();
        console.log(name, ' passed');
    } catch (error) {
        console.log(name , 'failed: ', error);
        console.log(error.stack);
    }
}

function assert(cond){
    if (!cond) {
        throw new Error();
    }
}

function arraysEqual(a, b){
    if(a.length != b.length){ return false;}
    for(let i = 0; i < a.length; i++){
        if(a[i] != b[i]){ return false;}
    }
    return true;
}


test('lexing delimiters', ()=>{
    let lexer = new Lexer(`{(}   
        +   ;  -`);
    let tokens = Array.from(lexer);
    let tokenString = tokens.map(x => x.value).join('');
    assert(tokenString == '{(}+;-');
    for(let i = 0; i < 3; i++){
        assert(tokens[i].line == 1);
        assert(tokens[i].col == i + 1);
    }
    for(let i = 3; i < tokens.length; i++){
        assert(tokens[i].line == 2);
    }
});

test('lexing literals', ()=>{
    let lexer = new Lexer(`1234
    5678`);
    // for(let token of lexer){
    //     console.log(token);
    // }
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);
    assert(arraysEqual(values, [1234,5678]));
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
    let values = tokens.map(x => x.value);

    assert(arraysEqual(values, ['<', '>', '<=', '>=', '!=', '=', '<', '!', '<']));
    assert(tokens[0].col == 1);
    assert(tokens[3].line == 1);
    assert(tokens[3].col == 8);
    assert(tokens[4].line == 2);
    assert(tokens[4].col = 5);
    assert(tokens[5].line == 2);
    assert(tokens[5].col == 8);
    assert(tokens[7] instanceof InvalidToken);
    assert(tokens[8] instanceof Token);
});

test('words', () => {
    let lexer = new Lexer(`void int hello while
    if else`); //'!' is invalid token
    // for(let token of lexer){
    //     console.log(token);
    // }
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);
    assert(arraysEqual(values, ['void', 'int', 'hello', 'while',
    'if', 'else']));
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
    }`); //'!' is invalid token
    // for(let token of lexer){
    //     console.log(token);
    // }
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);
    console.log(values.join(' '));
    assert(arraysEqual(values, ['void', 'function', '(', 'int', 'x', ',',
    'int', 'y', ')', '{', 'int', 'z', '=', 3, ';', 'int', 'y', '=', 5, ';',
    'return', 'y', '+', 'z', ';', '}']));

});


test('empty function def', ()=>{
    let lexer = new Lexer(`int aName(){
    }`);
    let parser = new Parser(lexer);
    let func = parser.parseFunction();
    assert(func instanceof FunctionDef);
    console.log(JSON.stringify(func));
});

test('func with parameters', ()=>{
    let lexer = new Lexer(`int aName(int x,
        int y, int z){
    }`);
    let parser = new Parser(lexer);
    let func = parser.parseFunction();
    assert(func instanceof FunctionDef);
    console.log(JSON.stringify(func));
});