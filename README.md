# TCP-Http-Client

This is a basic http client written in node.js. It uses the built in tls and net modules to send http requests. The client has built in socket pooling, a built in cookie container that can be turned on or off, and also supports using a proxy.

# Install

`npm install tcp-http-client`

# Example Usage

This example will send an HTTP POST request to www.example.com. It creates the TCPHttpClient, and then creates a request to be sent by the client. It adds headers and content to the request, then sends the request / receives and then logs the response.

```javascript
const {TCPHttpClient, TCPHttpRequest, TCPHttpMethod} = require('tcp-http-client');
const { URL } = require('url');

const client = new TCPHttpClient();

const request = new TCPHttpRequest(new URL("https://www.example.com"), TCPHttpMethod.POST);
request.addHeader("name", "value");
request.addContent("Example Content", "text/plain");

const response = await client.sendRequest(request); //returns a promise
console.log(response.content.toString()); //response.content will be a byte[] by default. It does not automatically decode encoded data.
client.dispose(); //Make sure to dispose of the client when finished using.
```

# API

## Class: TCPHttpClient

This class is the main class responsible for sending and receiving requests over sockets using net and tls modules. It does the parsing of http responses, and also connects to the proxy.

### new TCPHttpClient([options])

- options \<Object\> Available options are:
  - proxy \<Object\> Needs two fields <host, port> where host is a string, and port is an integer. If specified will create a proxy connection through the client.
  - CookieContainer \<Boolean\> If specified, turns the Cookie Container on for true or off for false. Default setting is true.

### TCPHttpClient.sendRequest(TCPHttpRequest)
- Sends an HTTP request to the server given in the TCPHttpRequest object.
- Returns a promise that is resolves to a TCPHttpResponseMessage when the HTTP response is received from the server. 

### TCPHttpClient.Connect(URL)
- Creates a connection to the specified URL and adds that connection to the socket pool without sending an HTTP message.

### TCPHttpClient.dispose()
- Closes all active listeners and connections within the socket pool.


## Class: TCPHttpRequest
This class is used to create a request to be used with the TCPHttpClient.

### new TCPHttpRequest(URL, TCPHttpMethod)
- returns an empty TCPHttpRequest with no headers or content.
  - URL \<URL\> The URL of a host you want to send a request to.
  - TCPHttpMethod \<TCPHttpMethod\> The type of request ex: TCPHttpMethod.POST or TCPHttpMethod.GET

### TCPHttpRequest.addHeader(Name, Value)
- adds a header to the TCPHttpRequest with header name: Name and value: Value.
  - Name \<String\>
  - Value \<String\>
  
### TCPHttpRequest.addContent(Content, ContentType)
- adds content to the TCPHttpRequest along with the content type.
  - Content \<String\>
  - ContentType \<String\> ex: "application/json", "text/plain"

### TCPHttpRequest.addCookie(CookieName, CookieValue)
- adds a cookie to the TCPHttpRequest.
  - CookieName \<String\>
  - CookieValue \<String\>
  
### TCPHttpRequest.toString()
- returns a string representation of the raw HTTP request that is going to be sent.

## Class: TCPHttpResponseMessage
This class represents the raw HTTP message that is sent back from the server when using TCPHttpClient.sendRequest()

### TCPHttpResponseMessage.Content
- Returns Buffer[] // this will not be decoded by default if the response is gzip / deflate / br etc.

### TCPHttpResponseMessage.StatusPhrase
- Returns a string of the HTTP status phrase ex: OK, Forbidden, Found

### TCPHttpResponseMessage.StatusCode
- Returns an Integer of the HTTP status code ex: 200, 403, 302

### TCPHttpResponseMessage.StatusVersion
- Returns a string of the HTTP version. Should always be HTTP/1.1

### TCPHttpResponseMessage.toString()
- Returns a string representation of the raw HTTP response.

