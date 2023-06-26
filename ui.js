//Author Ben Jones (benjones@cs.utah.edu)

import { assemble } from './modules/backend.js';
import { ParseError, Parser } from './modules/parser.js';
import { analyze } from './modules/semantic.js';


customElements.define('line-numbered-pane',
    class extends HTMLElement {
        constructor() {
            super();
            const template = document
                .getElementById('line-numbered-pane-template')
                .content;
            const shadowRoot = this.attachShadow({ mode: 'open' })
                .appendChild(template.cloneNode(true));
            
        }
        connectedCallback() {
            let contentPane = this.shadowRoot.querySelector('slot[name=content]').assignedElements()[0];
//            console.log(contentPane);
//            console.log(window.getComputedStyle(contentPane));
//            console.log(window.getComputedStyle(contentPane).getPropertyValue('font-family'));
            this.shadowRoot.getElementById('numbers').style.setProperty('font-family', 
            window.getComputedStyle(contentPane).getPropertyValue('font-family'));
        }
        updateLineNumbers(){
            let contentPane = this.shadowRoot.querySelector('slot[name=content]').assignedElements()[0];
            let numLines = contentPane.innerText.split('\n').length;
            let numberString = Array(numLines).fill().map((x, i) => i + 1).join('\n');
            this.shadowRoot.getElementById('numbers').innerHTML = numberString;

        }

    });

window.onload = () => {
    console.log("hello from ui.js");
    let editor = document.getElementById('editor');
    let asmElement = document.getElementById('asm');
    let errorWindow = document.getElementById('errorWindow');
    compile(); //compile the sample code right away

    let compileTimer;
    let whenToCompile;


    function timerCallback() {
        let now = new Date().getTime();
        if (now - whenToCompile < 0) {
            //not ready to update yet
            setTimeout(timerCallback, whenToCompile - now);
        } else {
            compileTimer = undefined;
            whenToCompile = undefined;
            compile();
        }
    }


    editor.addEventListener('input', (event) => {

        if (!compileTimer) {
            compileTimer = setTimeout(timerCallback, 1000);
        }
        //update the time on every keypress
        whenToCompile = new Date().getTime() + 1000;

    });


    function compile() {
        let source = editor.innerText;
        errorWindow.innerHTML = '';
        console.log("text to compile: ", source);
        let parser = new Parser(source);
        let func = parser.parseFunction();
        // if(func instanceof ParseError){
        //     displayCompilerErrors([func]);
        // }
        console.log("parsed function: ");
        console.log(func);
        let analysisResults = analyze(func);
        console.log("results:");
        console.log(analysisResults);

        if (analysisResults.errors.length == 0) {
            let asm = assemble(func).optimize();

            asmElement.innerHTML = asm.toString();
        } else {
            displayCompilerErrors(analysisResults.errors);
        }
        console.log(document.getElementById('editorPane'));
        document.getElementById('editorPane').updateLineNumbers();
        document.getElementById('assemblyPane').updateLineNumbers();

    }

    function displayCompilerErrors(errors) {
        for (let err of errors) {
            let li = document.createElement('li');
            li.classList.add('errorLine');
            li.innerHTML = `Line ${err.startLine} column ${err.startCol}: ${err.reason}`;
            errorWindow.append(li);

        }
    }
}

