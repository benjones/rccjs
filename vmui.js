import {VirtualMachine, decode, disassemble} from './modules/virtualMachine.js';

let svg = document.getElementById('vm').contentDocument
console.log(svg)

//Grab the URLs of each of the indicator light colors
//The NE indicators will have "off" colors for both
//The GT indicators will have "on" colors for both
//stored as gradients so I can apply the color as a URL
//and use something that's in the SVG produced by inkscape
//but need this hack because FWICT, Inkscape doesn't make it
//easy to assign an exportable ID to gradient defs

let indicatorRedOffFill = svg.querySelector('#ne_off').style.fill
let indicatorGreenOffFill = svg.querySelector('#ne_on').style.fill
let indicatorRedOnFill = svg.querySelector('#gt_off').style.fill
let indicatorGreenOnFill = svg.querySelector('#gt_on').style.fill

//assumes id is a text field with a tspan child to edit
function updateText(id, newText){
    svg.querySelector('#' +id).children[0].textContent = newText
}

let byteToString = b => b.toString(16).toUpperCase().padStart(2, '0')



let memory = []
let query = new URLSearchParams(document.location.search)
let vm
function reset(){
    if(query.has('memory')){
        let hexString = query.get('memory')
        memory = [...Array(hexString.length/2).keys()].map(
            i=>parseInt(hexString.slice(2*i, 2*(i+1)),16))
    }
    console.log(memory)
    vm = new VirtualMachine(memory)
    syncUI(vm)
}



function syncUI(vm){
    updateText('r0_text', byteToString(vm.reg[0]))
    updateText('r1_text', byteToString(vm.reg[1]))
    updateText('pc_text', byteToString(vm.pc))

    let hexText = svg.querySelector('#memory_contents_hex')
    let decText = svg.querySelector('#memory_contents_dec')
    let asmText = svg.querySelector('#memory_contents_asm') 
    for(let i = 0; i < 32; i++){
        hexText.children[i].textContent = byteToString(vm.ram[i])
        decText.children[i].textContent = vm.ram[i].toString()
        asmText.children[i].textContent = disassemble(vm.ram, i)
    }   

    function updateIndicator(prefix, state){
        svg.querySelector('#'+prefix+'_off').style.fill = state ? 
            indicatorRedOffFill : indicatorRedOnFill
        svg.querySelector('#'+prefix+'_on').style.fill = state ? 
            indicatorGreenOnFill : indicatorGreenOffFill
    }
    updateIndicator('ne', vm.ne)
    updateIndicator('gt', vm.gt)
    updateIndicator('halt', vm.halted)

}

reset()

document.getElementById('singleStep').onclick = ()=>{
    vm.step();
    syncUI(vm);
}

document.getElementById('reset').onclick = reset
    

