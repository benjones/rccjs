//Author Ben Jones (benjones@cs.utah.edu)

import { machineCodeToHex, writeMachineCode } from './modules/assembler.js';
import { assemble } from './modules/backend.js';
import { ParseError, Parser } from './modules/parser.js';
import { analyze } from './modules/semantic.js';

import { registerNumberedLineComponent, runWhenTypingStops } from './shared.js';

registerNumberedLineComponent();

window.onload = () => {
	let editor = document.getElementById('editor');
	let asmElement = document.getElementById('asm');
	let errorWindow = document.getElementById('errorWindow');
	let machineCodeElement = document.getElementById('machineCode');

	compile(); //compile the sample code right away

	//run 1s after typing stops
	//JK, this turned out to be bad UI
	//runWhenTypingStops(editor, compile);
	//runWhenTypingStops(asmElement, runAssembler);

	document.getElementById('compileButton').onclick = compile;
	document.getElementById('assembleButton').onclick = runAssembler;

	function compile() {
		let source = editor.innerText;
		editor.innerHTML = editor.innerText; //throw away all the formatting
		errorWindow.innerHTML = '';
		asmElement.innerHTML = '';
		machineCodeElement.innerHTML = '';
		let parser = new Parser(source);
		let func = parser.parseFunction();

		let analysisResults = analyze(func);

		if (analysisResults.errors.length == 0) {
			let asm = assemble(func).optimize();
			let asmString = asm.toString();
			asmElement.innerHTML = asmString;
			runAssembler();
		} else {
			displayCompilerErrors(analysisResults.errors);
		}
		//the panes are different from the elements we have cached
		//these are the custom elements that contain the line number bits
		document.getElementById('editorPane').updateLineNumbers();
		document.getElementById('assemblyPane').updateLineNumbers();
	}

	function runAssembler() {
		let asmString = asmElement.innerText;
		let assemblerOutput = writeMachineCode(asmString);
		if (assemblerOutput.errors.length > 0) {
			machineCodeElement.innerText = '';
			displayAssemblerErrors(assemblerOutput.errors);
		} else {
			let machineCode = machineCodeToHex(assemblerOutput.code);
			machineCodeElement.innerText = machineCode;
		}
	}

	function displayAssemblerErrors(errors) {
		//should really rarely happen.
		errorWindow.innerHTML = 'Errors in assembly:\n' + errors.join('\n');
	}

	function displayCompilerErrors(errors) {
		let source = editor.innerText.split('\n');
		//just highlight the whole lines, ignoring columns
		let highlightedLines = new Set();

		for (let err of errors) {
			let li = document.createElement('li');
			li.classList.add('errorLine');
			li.innerHTML = `Line ${err.startLine} column ${err.startCol}: ${err.reason}`;
			errorWindow.append(li);
			//array is 0 based, lines are 1 based
			for (let i = err.startLine - 1; i < err.endLine; i++) {
				if (!highlightedLines.has(i)) {
					highlightedLines.add(i);
					source[i] = `<span class="compilerError">${source[i]}</span>`;
				}
			}
		}
		editor.innerHTML = source.join('\n');
	}
};
