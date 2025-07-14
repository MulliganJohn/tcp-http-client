class TCPHttpResponseMessage {
    constructor() {
      this.statusPhrase = null;
      this.statusCode = null;
      this.statusVersion = null;
      this.headers = [];
      this.content = null;
      this.redirectChain = null;
    }
  
    getHeaderValues(targetName) {
      const lowercaseTargetName = targetName.toLowerCase();
      const matchingHeaders = this.headers.filter((h) => h.name.toLowerCase() === lowercaseTargetName);
      return matchingHeaders.length > 0 ? matchingHeaders : null;
    }
  
    getContentLength() {
        const header = this.getHeaderValues('Content-Length');
        if (header){
            return header[0].value;
        }
        else{return null}
    }

    isChunked(){
      const header = this.getHeaderValues('Transfer-Encoding');
      if (header && header[0].value === 'chunked'){
          return true;
      }
      else{return false}
    }
  
    toString() {
      let sb = [];
      sb.push(`${this.statusVersion} ${this.statusCode} ${this.statusPhrase}\r\n`);
      this.headers.forEach((header) => {
        sb.push(header.toString() + "\r\n");
      });
      sb.push("\r\n");
      sb.push(this.content);
      return sb.join("");
    }
  }
  module.exports = TCPHttpResponseMessage;