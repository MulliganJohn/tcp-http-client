const { URL } = require('url');
class TCPHttpRequest{
    constructor(url, httpMethod) {
        this.url = url;
        this.headers = [];
        this.cookies = [];
        this.content = null;
        this.httpMethod = httpMethod;
        this.keepAlive = true;
        this.addHeader("host", url.hostname)
    }

    addHeader(headerName, headerValue) {
        const existingHeaderIndex = this.headers.findIndex(header => header.name === headerName);
        if (existingHeaderIndex !== -1) {
            this.headers[existingHeaderIndex].value = headerValue;
        } else {
            this.headers.push({ name: headerName, value: headerValue });
        }
        if (headerName.toLowerCase() === "connection" && headerValue.toLowerCase() === "close") {
            this.keepAlive = false;
        }
    }

    addCookie(cookieName, cookieValue){
        this.cookies.push({ name: cookieName, value: cookieValue })
    }

    addContent(content, contentType)
    {
        this.content = content;
        this.addHeader("Content-Type", contentType + "; charset=utf-8");
        this.addHeader("Content-Length", content.length.toString());
    }
    _getCookieHeaderString(){
        let cookieString = [];
        for (const cookie of this.cookies){
          cookieString.push(cookie.name + "=" + cookie.value);
        }
        return "Cookie: " + cookieString.join("; ");
    }

    toString() {
        let sb = [];
        sb.push(`${this.httpMethod} ${this.url.toString()} HTTP/1.1\r\n`);
        for (const header of this.headers) {
          sb.push(`${header.name}: ${header.value}\r\n`);
        }
        if(this.cookies.length !== 0){
          sb.push(this._getCookieHeaderString() + '\r\n');
        }
        sb.push("\r\n");
        if (this.content){
          sb.push(this.content.toString());
        }
        return sb.join("");
      }
}
module.exports = TCPHttpRequest;