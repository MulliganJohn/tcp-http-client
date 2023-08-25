const EventEmitter = require('events');

class TCPHttpSocketWrapper extends EventEmitter {
  constructor() {
    super();
    this.socket = undefined;
    this.inUse = false;
    this.waitList = [];
    this.on('free', () => {
        if (this.waitList.length > 0){
            this.inUse = true;
            this.waitList.shift()();
        }
    })
  }

  acquire(callback){
    if (!this.inUse){
        this.inUse = true;
        callback();
    }
    else{
        this.waitList.push(callback);
    }
  }

  release(){
    this.inUse = false;
    this.emit('free');
  }

}
module.exports = TCPHttpSocketWrapper