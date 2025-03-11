export function registerNumberedLineComponent() {
	//custom element to add line numbers to the C and assembly editor panes
	customElements.define(
		'line-numbered-pane',
		class extends HTMLElement {
			constructor() {
				super();
				const template = document.getElementById('line-numbered-pane-template').content;
				const shadowRoot = this.attachShadow({ mode: 'open' }).appendChild(
					template.cloneNode(true)
				);
			}
			connectedCallback() {
				let contentPane = this.shadowRoot.querySelector('slot[name=content]').assignedElements()[0];
				this.shadowRoot
					.getElementById('numbers')
					.style.setProperty(
						'font-family',
						window.getComputedStyle(contentPane).getPropertyValue('font-family')
					);
			}
			updateLineNumbers() {
				let contentPane = this.shadowRoot.querySelector('slot[name=content]').assignedElements()[0];
				let numLines = contentPane.innerText.split('\n').length;
				let numberString = Array(numLines)
					.fill()
					.map((x, i) => i + 1)
					.join('\n');
				this.shadowRoot.getElementById('numbers').innerHTML = numberString;
			}
		}
	);
}

//trigger stuff to run after we stop typing
export function runWhenTypingStops(element, callback) {
	let timer;
	let when;
	function timerCallback() {
		let now = new Date().getTime();
		if (now - when < 0) {
			//not ready to update yet
			setTimeout(timerCallback, when - now);
		} else {
			timer = undefined;
			when = undefined;
			callback();
		}
	}
	element.addEventListener('input', (event) => {
		if (!timer) {
			timer = setTimeout(timerCallback, 1000);
		}
		//update the time on every keypress
		when = new Date().getTime() + 1000;
	});
}
