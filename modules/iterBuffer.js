
//buffered wrapper around an iterable thing to give you
//peek() 
export class IterBuffer {
    #it;
    #buf = [];
    constructor(iterator){
        this.#it = iterator;
    }

    next(){
        //print("next, buf: ", this.#buf.map(x => x.value.value).join(' '));
        if(this.#buf.length == 0){
            return this.#it.next();
        } else {
            return this.#buf.shift();
        }   
    }

    peek(){
        //print("peek, buf: ", this.#buf.map(x => x.value.value).join(' '));
        if(this.#buf.length == 0){
            this.#buf.push(this.#it.next());
            //print("was empty, justpushed: ", this.#buf.map(x => x.value.value).join(' '));
        }
        return this.#buf[0];
    }
}