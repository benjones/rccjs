import {assemble } from './modules/backend.js';
import { Parser } from './modules/parser.js';
import { analyze } from './modules/semantic.js';

window.onload = ()=>{
    console.log("hello from ui.js");
    let editor = document.getElementById('editor');
    let asmElement = document.getElementById('asm');
    editor.onkeydown = () =>{
        let source = editor.innerText;
        let parser = new Parser(source);
        let func = parser.parseFunction();
        let errors = analyze(func).errors;
        if(errors.length == 0){
            let asm = assemble(func).optimize();

            asmElement.innerHTML = asm.toString();
        }

    }
}