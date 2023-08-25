const net = require('net');
const tls = require('tls');
const TCPHttpResponseMessage = require('./TCPHttpResponseMessage');
const TCPHttpHeader = require('./TCPHttpHeader');
const TCPHttpSocketPool = require('./TCPHttpSocketPool');
const TCPHttpCookieContainer = require('./TCPHttpCookieContainer');

class TCPHttpClient{

    constructor(options){
        options = options || {};
        this.proxy = options.proxy || null;
        this.cookieContainerEnabled = options.CookieContainer || true;
        this.cookieContainer = new TCPHttpCookieContainer();
        this.socketPool = new TCPHttpSocketPool();
    }

    _getTlsOptions(request, socket){
        const options = {
            host: request.url.hostname,
            port: 443,
            servername: request.url.hostname
        }
        if (socket){
            options.socket = socket;
            options.rejectUnauthorized = false;
        }
        return options;
    }

    async sendRequest(request) {
        return new Promise(async (resolve, reject) => {
            try{
                if(request.url.protocol === "https:"){
                    const response = await this._sendHttpsRequest(request);
                    resolve(response);
                }
                else if(request.url.protocol === "http:"){
                    const response = await this._sendHttpRequest(request);
                    resolve(response);
                }
                else{
                    throw new Error("Incorrect URL protocol");
                }
            }
            catch(error) {
                reject(new Error("Error sending request: " + error));
            }     
        });
    }

    async connect(url){
        return await this.sendRequest({url: url, connect: true});
    }

    responseDataParser(data, response, dataContainer, finished, url){
        dataContainer.dataBuffer = Buffer.concat([dataContainer.dataBuffer, data]);
        if (!dataContainer.headerData && dataContainer.dataBuffer.includes("\r\n\r\n")){
            const contentIndex = dataContainer.dataBuffer.indexOf("\r\n\r\n");
            dataContainer.headerData = dataContainer.dataBuffer.slice(0, contentIndex).toString();
            dataContainer.dataBuffer = dataContainer.dataBuffer.slice(contentIndex + 4);
            this._parseHeaderData(response, dataContainer.headerData, url);
            dataContainer.contentLength = response.getContentLength();
        }
        if (response.isChunked()){
            this._parseChunkedData(response, dataContainer, finished);
        }
        else if (dataContainer.contentLength){
            this._parseFixedData(response, dataContainer, finished);
        }
        else if (dataContainer.headerData)
        {
            finished();
        }
    }

    _sendHttpsRequest(request){
        return new Promise(async (resolve, reject) => {
            try {
                let tlsSocketWrapper = await this.socketPool.getSocket(request.url.hostname, request.url.protocol);
                let tlsSocket = null;
                if (!tlsSocketWrapper.socket){
                    this.proxy ? tlsSocket = await this.connectToProxy(request, tlsSocket) : tlsSocket = await this._tlsSecureConnect(this._getTlsOptions(request));
                }
                else{tlsSocket = tlsSocketWrapper.socket}
                if (request.connect){
                    resolve(true);
                    this.socketPool.releaseSocket(request.url.hostname, request.url.protocol, tlsSocket);
                    return;
                }
                const response = new TCPHttpResponseMessage();
                const dataContainer = { 
                    headerData: "", 
                    contentData: Buffer.alloc(0),
                    contentLength: "",
                    dataBuffer: Buffer.alloc(0)
                };
                if (this.cookieContainerEnabled){
                    const cookies = this.cookieContainer.getCookies(request.url);
                    for (const cookie of cookies){
                        request.addCookie(cookie.cookieName, cookie.cookieValue);
                    }
                }
                tlsSocket.write(request.toString());

                const responseDataParserCallback = () => {
                    tlsSocket.removeListener("data", responseDataParserWrapper);
                    if(request.keepAlive){
                        this.socketPool.releaseSocket(request.url.hostname, request.url.protocol, tlsSocket);
                    }
                    else{
                        tlsSocket.destroy();
                        this.socketPool.removeSocket(`${request.url.hostname}_${request.url.protocol}`);
                    }
                    !request.keepAlive && tlsSocket.destroy();
                    resolve(response);
                    return;
                };
                const responseDataParserWrapper = (data) => {
                    this.responseDataParser(data, response, dataContainer, responseDataParserCallback, request.url);
                  }
                tlsSocket.on("data", responseDataParserWrapper);
            }
            catch (error){
                this.socketPool.releaseSocket(request.url.hostname, request.url.protocol);
                reject(new Error("Error while sending https request: " + error));
            }
        });
    }

    _sendHttpRequest(request){
        return new Promise(async (resolve, reject) => {
            try {
                let socketWrapper = await this.socketPool.getSocket(request.url.hostname, request.url.protocol);
                let netSocket = null;
                if (!socketWrapper.socket){
                    this.proxy ? netSocket = await this.connectToProxy(request, netSocket) : netSocket = net.createConnection({host: request.url.hostname, port: 80});
                }
                else{netSocket = socketWrapper.socket}
                if (request.connect){
                    resolve(true);
                    this.socketPool.releaseSocket(request.url.hostname, request.url.protocol, netSocket);
                    return;
                }
                const response = new TCPHttpResponseMessage();
                const dataContainer = { 
                    headerData: "", 
                    contentData: Buffer.alloc(0),
                    contentLength: "",
                    dataBuffer: Buffer.alloc(0)
                };
                if (this.cookieContainerEnabled){
                    const cookies = this.cookieContainer.getCookies(request.url);
                    for (const cookie of cookies){
                        request.addCookie(cookie.cookieName, cookie.cookieValue);
                    }
                }
                netSocket.write(request.toString());
                const responseDataParserCallback = () => {
                    netSocket.removeListener("data", responseDataParserWrapper);
                    if(request.keepAlive){
                        this.socketPool.releaseSocket(request.url.hostname, request.url.protocol, tlsSocket);
                    }
                    else{
                        netSocket.destroy();
                        this.socketPool.removeSocket(`${request.url.hostname}_${request.url.protocol}`);
                    }
                    !request.keepAlive && netSocket.destroy();
                    resolve(response);
                    return;
                };
                const responseDataParserWrapper = (data) => {
                    this.responseDataParser(data, response, dataContainer, responseDataParserCallback, request.url);
                  }
                netSocket.on("data", responseDataParserWrapper);
            }
            catch (error){
                reject(new Error("Error while sending https request: " + error));
            }
        });
    }

    _parseHeaderData(response, headerData, url){
        try {
            const headers = headerData.split("\r\n");
            const statusLine = headers[0];
            const statusParts = statusLine.split(' ');
            response.statusVersion = statusParts[0];
            response.statusCode = parseInt(statusParts[1]);
            response.statusPhrase = statusParts[2];
            for (let i = 1; i < headers.length; i++){
                const headerParts = headers[i].split(": ");
                const headerName = headerParts[0];
                const headerValue = headerParts[1];
                response.headers.push(new TCPHttpHeader(headerName, headerValue));
                if (this.cookieContainerEnabled && headerName.toLowerCase() === "set-cookie"){
                    this.cookieContainer.addCookie(headerValue, url);
                }
            }
        }
        catch (error) {
            throw new Error("Error while parsing response header: " + error)
        }
    }

    _parseChunkedData(response, dataContainer, finished){
        let chunkLength = 0;
        while (dataContainer.dataBuffer.length > 0){
            const delimiterIndex = dataContainer.dataBuffer.indexOf("\r\n");
            if (delimiterIndex === -1){
                break;
            }
            chunkLength = parseInt(dataContainer.dataBuffer, 16);
            if (chunkLength === 0){
                response.content = dataContainer.contentData;
                finished();
                break;
            }
            if (dataContainer.dataBuffer.length > chunkLength + delimiterIndex + 2){
                dataContainer.contentData = Buffer.concat([dataContainer.contentData, dataContainer.dataBuffer.slice(delimiterIndex + 2, chunkLength + delimiterIndex + 2)]);
                dataContainer.dataBuffer = dataContainer.dataBuffer.slice(delimiterIndex + 2 + chunkLength + 2);
            }
            else{
                break;
            }
        }
    }

    _parseFixedData(response, dataContainer, finished){
        if (dataContainer.dataBuffer.length === parseInt(dataContainer.contentLength)){
            response.content = dataContainer.dataBuffer;
            finished()
        }
    }

    _tlsSecureConnect(options){
        return new Promise(async (resolve, reject) => {
            try {
                const tlsSocket = tls.connect(options);
                const secureConnectHandler = () => {
                    cleanup();
                    resolve(tlsSocket);
                    return;
                  };
            
                  const errorHandler = (error) => {
                    cleanup();
                    reject(new Error("Error while creating a secure connection! " + error));
                  };
            
                  const cleanup = () => {
                    tlsSocket.removeListener("secureConnect", secureConnectHandler);
                    tlsSocket.removeListener("error", errorHandler);
                  };
            
                  tlsSocket.on("secureConnect", secureConnectHandler);
                  tlsSocket.on("error", errorHandler);
            }
            catch (error){
                reject(new Error("Error while creating a secure connection: " + error));
            }
        });
    }

    connectToProxy(request, socket){
        return new Promise(async (resolve, reject) => {
            try {
                socket = net.createConnection({host: this.proxy.host, port: this.proxy.port}, async () =>{
                const port = request.url.protocol === 'https:' ? 443 : 80;
                const requestData = `CONNECT ${request.url.hostname}:${port} HTTP/1.1\r\nHost: ${request.url.hostname}:${port}\r\n\r\n`;
                socket.write(requestData);
            });
            
            const onData = async (data) => {
                if (data.toString().startsWith("HTTP/1.1 200 Connection Established")) {
                    if(request.url.protocol === "https:"){
                        socket = await this._tlsSecureConnect(this._getTlsOptions(request, socket))
                    }
                    cleanup();
                    resolve(socket);
                    return;
                } else {
                    cleanup();
                    reject(new Error("Error Connecting to Proxy"));
                }
            };
            
            const onError = () => {
                cleanup();
                reject(new Error("Error Connecting to Proxy"));
            };
            
            const cleanup = () => {
                socket.removeListener("data", onData);
                socket.removeListener("error", onError);
            };
            
            socket.on("data", onData);
            socket.on("error", onError);

            }
            catch (error){
                reject(new Error("Error Connecting to Proxy: " + error));
            }
        });
    }

    async delay(ms) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      }

    async dispose() {
        this.socketPool.dispose();    
    }
}
module.exports = TCPHttpClient;