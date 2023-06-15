
//buffered wrapper around an iterable thing to give you
//peek() 
export class IterBuffer {
    #it;
    #buf = [];
    #mostRecent;
    constructor(iterator){
        this.#it = iterator;
    }

    next(){
        //print("next, buf: ", this.#buf.map(x => x.value.value).join(' '));
        if(this.#buf.length == 0){
            this.#mostRecent = this.#it.next();
            return this.#mostRecent;
        } else {
            this.#mostRecent = this.#buf.shift();
            return  this.#mostRecent;
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

    //token returned by the last call to next()
    prev(){
        return this.#mostRecent;
    }
}