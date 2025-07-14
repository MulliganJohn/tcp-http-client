const TCPHttpCookie = require("./TCPHttpCookie");

class TCPHttpCookieContainer{
    constructor(){  
        this.cookieContainer = new Map();
    }

    addCookie(cookieString, url, rawCookie = false){
        try{
            //allows manual addition of saved cookie objects into the cookie container rather than set-cookie string or one time cookie requests
            const newCookie = rawCookie ? cookieString : this.parseCookie(cookieString, url);
            const cookiePathMap = this.cookieContainer.get(newCookie.cookieDomain);
            //Cookie container does not contain a key with the current cookie domain value
            if (!cookiePathMap){
                const pathMap = new Map();
                const cookieMap = new Map();
                cookieMap.set(newCookie.getCookieKey(), newCookie);
                pathMap.set(newCookie.cookiePath, cookieMap)
                this.cookieContainer.set(newCookie.cookieDomain, pathMap);
            }
            //Cookie container contains a key with the current cookie domain value, but does not contain a key for the current cookie path
            else if (!cookiePathMap.has(newCookie.cookiePath)){
                const cookieMap = new Map();
                cookieMap.set(newCookie.getCookieKey(), newCookie);
                cookiePathMap.set(newCookie.cookiePath, cookieMap);
            }
            //Cookie contaier contains a key of the current cookie domain, which has a key for the current cookie path
            else if (cookiePathMap.has(newCookie.cookiePath)){
                const cookieMap = cookiePathMap.get(newCookie.cookiePath);
                if (!cookieMap.get(newCookie.getCookieKey())){
                    cookieMap.set(newCookie.getCookieKey(), newCookie);
                }
                else{
                    cookieMap.set(newCookie.getCookieKey(), newCookie);
                }
            }
        }
        catch (error){
            console.log("Error adding new cookie to the cookie container: " + error);
        }
    }

    getCookies(url){
        const urlHost = url.hostname;
        let paths = this.getAllPathCombinations(url.pathname);
        let domains = [];
        domains.push(urlHost);
        let dotIndex = urlHost.indexOf('.');
        if (dotIndex !== -1){
            domains.push(urlHost.substring(dotIndex + 1));
            if (urlHost.length > 2){
                let lastDot = urlHost.lastIndexOf('.', urlHost.length - 2);
                if (lastDot > 0){
                    lastDot = urlHost.lastIndexOf('.', lastDot - 1);
                }
                if (lastDot !== -1){
                    while ((dotIndex < lastDot) && (dotIndex = urlHost.indexOf('.', dotIndex + 1)) != -1){
                        domains.push(urlHost.substring(dotIndex + 1));
                    }
                }
            }
        }
        return this.findCookies(domains, paths, url);
    }

    findCookies(domains, paths, url){
        let cookies = [];
        let deletion = [];
        domains.forEach(domain => {
            if (this.cookieContainer.has(domain)){
                const pathMap = this.cookieContainer.get(domain);
                paths.forEach(path => {
                    if (pathMap.has(path)){
                        const cookieMap = pathMap.get(path);
                        cookieMap.forEach((cookie) => {
                            if (cookie.cookieExpiryTime && cookie.cookieExpiryTime < new Date()){
                                deletion.push({domain: domain, path: path, cookieKey: cookie.getCookieKey()});
                            }
                            else if ( (cookie.hostOnlyFlag && cookie.cookieDomain === url.hostname) || (!cookie.hostOnlyFlag) ) {
                                if (cookie.secureOnlyFlag && url.protocol === "https:") {
                                    cookies.push(cookie);
                                    cookie.cookieLastAccessTime = new Date();
                                } else if (!cookie.secureOnlyFlag) {
                                    cookies.push(cookie);
                                    cookie.cookieLastAccessTime = new Date();
                                }
                            }
                        })
                    }
                })
            }
        });
        this.removeCookies(deletion);
        return cookies;
    }

    removeCookies(deletion){
        deletion.forEach(cookieInfo => {
            const pathMap = this.cookieContainer.get(cookieInfo.domain);
            const cookieMap = pathMap.get(cookieInfo.path);
            cookieMap.delete(cookieInfo.cookieKey);
            if (cookieMap.size === 0){
                pathMap.delete(cookieInfo.path);
                if (pathMap.size === 0){
                    this.cookieContainer.delete(cookieInfo.domain);
                }
            }
        })
    }


    parseCookie(cookieString, url){
        try{
            const nameValueIndex = cookieString.indexOf(';');
            if (nameValueIndex > 0){
                const cookieNameValuePair = cookieString.slice(0, nameValueIndex);
                const cookie = this.parseNameValuePair(cookieNameValuePair);
                const attributeString = cookieString.slice(nameValueIndex + 1);
                this.parseAttributes(attributeString, cookie, url);
                return cookie;
            }
            else{
                const cookie = this.parseNameValuePair(cookieString);
                this.parseAttributes("", cookie, url);
                return cookie;
            }
        }
        catch (error){
            throw new Error("Error parsing cookie string: " + error);
        }
    }

    parseNameValuePair(cookieNameValuePair) {
        try{
            const nameValueSplitIndex = cookieNameValuePair.indexOf('=');
        
            if (nameValueSplitIndex !== -1) {
              const cookieName = cookieNameValuePair.slice(0, nameValueSplitIndex).trim();
              const cookieValue = cookieNameValuePair.slice(nameValueSplitIndex + 1).trim();
              
              if (cookieName.length !== 0) {
                return new TCPHttpCookie(cookieName, cookieValue);
              }
            }

            return null;
        }
        catch (error){
            throw new Error("Error parsing cookie name value pair: " + error);
        }
      }

    parseAttributes(attributeString, cookie, url){
        try{
            const avPairs = attributeString.split(';')
            for (const avPair of avPairs){
                this.parseAVPair(avPair, cookie, url);
            }
            if (!cookie.cookieDomain){
                cookie.cookieDomain = url.hostname;
                cookie.hostOnlyFlag = true;
            }
            if (!cookie.cookiePath){
                cookie.cookiePath = this.getDefaultPath(url);
            }
            cookie.cookieCreationTime = new Date();
            cookie.cookieLastAccessTime = new Date();
        }
        catch (error){
            throw new Error(error);
        }
    }

    parseAVPair(avPairString, cookie, url){
        try{
            if (avPairString.length > 0){
                const [avName, avValue] = avPairString.split('=').map(part => part.trim());
                switch (avName.toLowerCase()) {
                    case "expires":
                        const cookieExpiryTime = this.parseCookieDate(avValue);
                        if (cookieExpiryTime){
                            cookie.cookieExpiryTime = cookieExpiryTime;
                        }
                        break;
                    case "max-age":
                        const cookieMaxAge = this.parseCookieMaxAge(avValue);
                        if (cookieMaxAge){
                            cookie.cookieExpiryTime = cookieMaxAge;
                        }
                        break;
                    case "domain":
                        const cookieDomain = this.parseCookieDomain(avValue, url);
                        if (cookieDomain){
                            cookie.cookieDomain = cookieDomain;
                        }
                        break;
                    case "path":
                        const cookiePath = this.parseCookiePath(avValue, url);
                        if (cookiePath){
                            cookie.cookiePath = cookiePath;
                        }
                        break;
                    case "secure":
                        cookie.secureOnlyFlag = true;
                        break;
                    case "httponly":
                        cookie.httpOnlyFlag = true;
                        break;
                    default:
                        break
                  }
            }
        }
        catch (error){
            throw new Error("Error parsing AV pair: " + error);
        }
    }

    parseCookieDate(cookieDate) {
        try{
            if (typeof cookieDate !== 'string' || cookieDate.trim() === '') {
                return null;
            }
            const parsedDate = new Date(cookieDate);
            
            if (isNaN(parsedDate.getTime())) {
              return null;
            } 

            return parsedDate;
        }
        catch (error){
            throw new Error("Error parsing cookie date: " + error);
        }
      }

    parseCookieMaxAge(maxAgeAVValue){
        try{
            const firstChar = maxAgeAVValue.charAt(0);
            if (!/[\d-]/.test(firstChar)) {
                return; // Ignore the cookie-av
            }
        
            if (/[^\d]/.test(maxAgeAVValue.slice(1))) {
                return; // Ignore the cookie-av 
            }
        
            const deltaSeconds = parseInt(maxAgeAVValue, 10);
        
            let expiryTime;
            if (deltaSeconds <= 0) {
                expiryTime = new Date(0); // Earliest representable date and time
            } else {
                const currentTime = new Date();
                expiryTime = new Date(currentTime.getTime() + deltaSeconds * 1000);
            }
            return expiryTime;
        }
        catch (error){
            throw new Error("Error parsing cookie max age: " + error);
        }
    }

    parseCookieDomain(domainString, url){
        try{
            if (domainString){
                if(domainString[0] === '.'){
                    domainString = domainString.substring(1);
                }
                if (this.domainMatches(domainString, url.hostname)){
                    return domainString;
                }
                else{
                    throw new Error("Error cookie domain does not match host domain");
                }
            }
        }
        catch (error){
            throw new Error(error);    
        }
    }

    domainMatches(domainString, hostString) {
        try{
            const domainStringLower = domainString.toLowerCase();
            const hostStringLower = hostString.toLowerCase();
          
            // Check if the domain string and the string are identical
            if (domainStringLower === hostStringLower) {
              return true;
            }
          
            // Check if the domain string is a suffix of the string
            if ( hostStringLower.endsWith(domainStringLower) &&
                 hostStringLower[hostStringLower.length - domainStringLower.length - 1] === '.') {
                const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(hostStringLower);
                return !isIpAddress;
            }
          
            return false;
        }
        catch (error){
            throw new Error("Error matching domain name to host: " + error);
        }
    }

    parseCookiePath(cookiePath, url){
        try{
            if (!cookiePath || cookiePath[0] !== '/'){
                return getDefaultPath(url);
            }
            else{
                return cookiePath;
            }
        }
        catch (error){
            throw new Error("Error parsing cookie path: " + error);
        }
    }

    getDefaultPath(url) {
        try{
            // Step 1: Get the uri-path from the URL
            let uriPath = url.pathname;
        
            // Step 2: If the uri-path is empty or doesn't start with "/", output "/"
            if (!uriPath || uriPath.charAt(0) !== "/") {
            return "/";
            }
        
            // Step 3: If uri-path has at most one "/" character, output "/"
            if (uriPath.indexOf("/", 1) === -1) {
            return "/";
            }
        
            // Step 4: Output the characters of uri-path up to the right-most "/"
            let lastIndex = uriPath.lastIndexOf("/");
            return uriPath.substring(0, lastIndex);
        }
        catch (error){
            throw new Error("Error getting default path: " + error);
        }
    }

    getAllPathCombinations(path) {
        if (path === '/'){
            return ['/'];
        }
        let combinations = ["/", path];
        let pathIndex = path.indexOf('/', 1);
        while (pathIndex !== -1){
            combinations.push(path.slice(0,pathIndex));
            pathIndex = path.indexOf('/', pathIndex + 1);
        }
        return combinations;
    }

    //exports cookies to be saved and re-added later via addCookie with rawCookie = true
    getAllCookies(){
        let cookies = []
        for (const pathMap of this.cookieContainer.values()){
            for (const cookieMap of pathMap.values()){
                for (const cookie of cookieMap.values()){
                    cookies.push(cookie)
                }
            }
        }
        return cookies
    }

}
module.exports = TCPHttpCookieContainer