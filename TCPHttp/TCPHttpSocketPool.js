const TCPHttpSocketWrapper = require("./TCPHttpSocketWrapper");

class TCPHttpSocketPool {
    constructor() {
      this.socketPool = new Map();
      this.socketTimeouts = new Map();
      this.socketTimeoutDuration = 30000;
    }
  
    _startListeners(socket, socketKey){
        socket.on("error", () => {
            console.log("got socket error");
            this.removeSocket(socketKey);
        });

        socket.on("end", () => {
            this.removeSocket(socketKey);
        });
    }

    _startSocketTimeout(socketKey) {
        const timeoutId = setTimeout(() => {
          this.removeSocket(socketKey);
        }, this.socketTimeoutDuration);
        this.socketTimeouts.set(socketKey, timeoutId);
    }

    _clearSocketTimeout(socketKey) {
        const timeoutId = this.socketTimeouts.get(socketKey);
        clearTimeout(timeoutId);
        this.socketTimeouts.delete(socketKey);
    }

    addSocket(socketKey) {
        const socketWrapper = new TCPHttpSocketWrapper();
        if (!this.socketPool.has(socketKey)) {
          this.socketPool.set(socketKey, socketWrapper);
        }
    }
    
    getSocket(hostname, protocol) {
      return new Promise((resolve) =>{
        const socketKey = this._getSocketKey(hostname, protocol);
        if (this.socketPool.has(socketKey)) {
            const socketWrapper = this.socketPool.get(socketKey);
            socketWrapper.acquire(() => {
                this._clearSocketTimeout(socketKey);
                resolve(socketWrapper);
            });
        }
        else{
          this.addSocket(socketKey);
          const socketWrapper = this.socketPool.get(socketKey);
          socketWrapper.acquire(() => {
            resolve(socketWrapper);
          });
        }
      })
    }

      releaseSocket(hostname, protocol, socket){
        const socketKey = this._getSocketKey(hostname, protocol);
        let socketWrapper = this.socketPool.get(socketKey);
        if(!socketWrapper.socket){
          if (socket){
            socketWrapper.socket = socket;
            this._startListeners(socketWrapper.socket, socketKey);
            this._startSocketTimeout(socketKey);
            socketWrapper.release();
          }
          else{
            socketWrapper.release();
          }
        }
        else{
          this._startSocketTimeout(socketKey);
          socketWrapper.release();
        }
      }

      removeSocket(socketKey) {
        if (this.socketPool.has(socketKey)){
          const socket = this.socketPool.get(socketKey).socket;
          if (socket){
            socket.end();
          }
          this._clearSocketTimeout(socketKey);
          this.socketPool.delete(socketKey);
        }
      }

      _getSocketKey(hostname, protocol) {
        return `${hostname}_${protocol}`;
      }

      dispose() {
        for (const timeoutId of this.socketTimeouts.values()) {
            clearTimeout(timeoutId);
          }
        for (const socketWrapper of this.socketPool.values()) {
            socketWrapper.socket && socketWrapper.socket.end();
        }
        this.socketPool.clear();
        this.socketTimeouts.clear();
      }
  }
  module.exports = TCPHttpSocketPool;