import { registerNumberedLineComponent, runWhenTypingStops } from "./shared.js";
import {machineCodeToHex, writeMachineCode } from './modules/assembler.js';
registerNumberedLineComponent();


window.onload = () => {
    let asmElement = document.getElementById('asm');
    let machineCodeElement = document.getElementById('machineCode');

    runWhenTypingStops(asmElement, runAssembler);

    function runAssembler(){
        let asmString =  asmElement.innerText;
        document.getElementById('assemblyPane').updateLineNumbers();
        let machineCode = machineCodeToHex(writeMachineCode(asmString));
        machineCodeElement.innerText = machineCode;
    }
    runAssembler(); //run on startup
}