class TCPHttpCookie{
    constructor(cookieName, cookieValue){  
        this.cookieName = cookieName;
        this.cookieValue = cookieValue;
        this.cookieExpiryTime = undefined;
        this.cookieDomain = undefined;
        this.cookiePath = undefined;
        this.cookieCreationTime = undefined;
        this.cookieLastAccessTime = undefined;
        this.hostOnlyFlag = false;
        this.secureOnlyFlag = false;
        this.httpOnlyFlag = false;
    }

    getCookieKey(){
        return (this.cookieName + ":" + this.cookieDomain + ":" + this.cookiePath);
    }
}
module.exports = TCPHttpCookie