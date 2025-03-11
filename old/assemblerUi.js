import { registerNumberedLineComponent, runWhenTypingStops } from './shared.js';
import { machineCodeToHex, writeMachineCode } from './modules/assembler.js';

registerNumberedLineComponent();

window.onload = () => {
	let asmElement = document.getElementById('asm');
	let machineCodeElement = document.getElementById('machineCode');
	let errorWindow = document.getElementById('errorWindow');

	//runWhenTypingStops(asmElement, runAssembler);
	document.getElementById('assembleButton').onclick = runAssembler;

	function runAssembler() {
		let asmString = asmElement.innerText;
		document.getElementById('assemblyPane').updateLineNumbers();
		errorWindow.innerHTML = '';
		machineCodeElement.innerText = '';

		let assemblerOutput = writeMachineCode(asmString);
		if (assemblerOutput.errors.length > 0) {
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

	runAssembler(); //run on startup
};
