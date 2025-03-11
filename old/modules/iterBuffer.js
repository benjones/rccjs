//Author Ben Jones (benjones@cs.utah.edu)

//buffered wrapper around an iterable thing to give you
//peek()
export class IterBuffer {
	#it;
	#buf = [];
	#mostRecent;
	constructor(iterator) {
		this.#it = iterator;
	}

	next() {
		//print("next, buf: ", this.#buf.map(x => x.value.value).join(' '));
		if (this.#buf.length == 0) {
			this.#mostRecent = this.#it.next();
			//console.log("next: ", JSON.stringify(this.#mostRecent));
			return this.#mostRecent;
		} else {
			this.#mostRecent = this.#buf.shift();
			// console.log("next: ", JSON.stringify(this.#mostRecent));
			return this.#mostRecent;
		}
	}

	peek() {
		//print("peek, buf: ", this.#buf.map(x => x.value.value).join(' '));
		if (this.#buf.length == 0) {
			this.#buf.push(this.#it.next());
			//print("was empty, justpushed: ", this.#buf.map(x => x.value.value).join(' '));
		}
		//console.log("peek: ", JSON.stringify(this.#buf[0]));
		return this.#buf[0];
	}

	//token returned by the last call to next()
	prev() {
		//console.log("prev: ", JSON.stringify(this.#mostRecent));
		return this.#mostRecent;
	}
}
