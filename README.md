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
request.addCookie("name", "value");

const response = await client.sendRequest(request); //returns a promise
console.log(response.content.toString()); //response.content will be a byte[] by default. It does not automatically decode encoded data.
client.dispose(); //Make sure to dispose of the client when finished using.
```

# API

## Class: TCPHttpClient

This class is the main class responsible for sending and receiving requests over sockets using net and tls modules. It does the parsing of http responses, and also connects to the proxy.
| Constructor| Parameters| Returns| Description|
|----------|----------|-------|--------|
| `new TCPHttpClient(options)`| `(object)` | `TCPHttpClient` | Initializes a new `TCPHttpClient` instance. Options object changes it's function. View options below |

| Option| Type|Description|
|----------|-------|--------|
| `proxy`| `(object)` | |
| `CookieContainer`| `(Boolean)` | If specified, turns the Cookie Container on for true or off for false. Default setting is true. |
| `socketTimeOutDuration`| `(Integer)` |If specified, sets the socket timeout duration(millis -> default 30000)  |
| `allowRedirects`| `(Boolean)` |If specified, turns on automatic redirects with a default maxRedirect value of 10. |
| `maxRedirects`| `(Integer)` |If specified, changes the default max redirect value (10) to something else.|

  ```javascript
  const {TCPHttpClient, TCPHttpRequest, TCPHttpMethod} = require('tcp-http-client');
  //TCPHttpClient initialized with a Proxy and Cookie Container
  const options = {
  	proxy: {
  		host: "127.0.0.1",
  		port: 8888
        authorization: {
    	    username: "username",
            password: "password"
        }
  	},
  	CookieContainer: false,
    socketTimeoutDuration: 60000,
    allowRedirects: true,
    maxRedirects: 5
  };
  const client = new TCPHttpClient(options);
	
  //Modify options after creation
  client.CookieContainerEnabled = false
  client.proxy = null
  client.socketPool.socketTimeoutDuration = 30000
  client.maxRedirects = 10
  client.allowRedirects = false
  ```


| Method | Parameters | Returns | Description |
|--------|----------|---------|-------------|
| `sendRequest(TCPHttpRequest)` | `(TCPHttpRequest)` | `Promise<TCPHttpResponseMessage>` | Sends an HTTP request to the server given in the TCPHttpRequest object. |
| `Connect(URL)` | `(URL)` | `void` | Creates a connection to the specified URL and adds that connection to the socket pool without sending an HTTP message. Allows quicker sending of time sensitive requests (Don't have to wait for TLS handshake upon next request) |
|`dispose()`|`()`|`void`|Closes all active listeners and connections within the socket pool.|


## Class: TCPHttpRequest
This class is used to create a request to be used with the TCPHttpClient.

| Constructor| Parameters| Returns| Description|
|----------|----------|-------|--------|
| `new TCPHttpRequest(URL,TCPHttpMethod)`| `(URL,TCPHttpMethod)` | `TCPHttpRequest` | Initializes a new `TCPHttpRequest` instance with no headers or content. `URL` is the target URL for the request, and `TCPHttpMethod` specifies the request type (e.g., `TCPHttpMethod.POST` or `TCPHttpMethod.GET`). |

```javascript
const {TCPHttpClient, TCPHttpRequest, TCPHttpMethod} = require('tcp-http-client');
const request = new TCPHttpRequest(new URL("https://www.example.com"), TCPHttpMethod.POST);
```
| Method  | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `addHeader(Name,Value)` | `(string,string)` | `void` | adds a header to the TCPHttpRequest with header name: Name and value: Value.  |
| `addContent(Content,ContentType)` | `(string,string)` | `void` | Returns a string representation of the raw HTTP response. |
|`addCookie(CookieName,CookieValue)` |`(string,string)`|`void`|adds a cookie to the TCPHttpRequest.|
|`toString()`|`()`|`string`|returns a string representation of the raw HTTP request that is going to be sent.|

```javascript
// ContentType should follow HTTP standards ex: "application/json", "text/plain"
request.addContent(obj.toString(), "application/json")
```


## Class: TCPHttpResponseMessage
This class represents the raw HTTP message that is sent back from the server when using TCPHttpClient.sendRequest()

| Properties        | Type       | Description |
|----------------|------------|-------------|
| `content`       | `Buffer[]` | Raw response data. Use `response.content.toString()`. If encoded (gzip/deflate/br), decode it manually. |
| `statusCode`    | `number`   | HTTP status code (e.g., `200`, `403`, `302`) |
| `statusPhrase`  | `string`   | HTTP status message (e.g., `"OK"`, `"Forbidden"`, `"Found"`) |
| `statusVersion` | `string`   | HTTP version (Always `"HTTP/1.1"`).  |
| `headers`| `TCPHttpHeader[]` | List of all headers present in the response.|

| Method | Parameters | Returns | Description |
|-------------|------------|---------|-------------|
| `getHeaderValues(targetName)` | `(string)` | `TCPHttpHeader[] or null ` | Returns a list of headers matching the input string "targetName" or null if none are found  |
| `toString()`  | `()` | `string` | Returns a string representation of the raw HTTP response. |

## Class: TCPHttpCookie
This class is a custom cookie object created to be used with the custom CookieContainer.
| Properties        | Type       | Description |
|----------------|------------|-------------|
| `cookieName`       | `string` | Cookie name |
| `cookieValue`    | `string`   | Cookie value |
| `cookieExpiryTime`  | `Date`   | Cookie Expiry Time specified by server |
| `cookieDomain` | `string`   | Cookie Domain specified by server  |
| `cookiePath`| `string` | Cookie path specified by server|
| `cookieCreationTime`| `Date` | DateTime created when cookie is recieved from server|
| `cookieLastAccessTime`| `Date` | DateTime updated any time the cookie is used in a request or response|
| `hostOnlyFlag`| `Boolean` | hostOnlyFlag|
| `secureOnlyFlag`| `Boolean` | secureOnlyFlag|
| `httpOnlyFlag`| `Boolean` | httpOnlyFlag|

| Method | Static | Parameters | Returns | Description |
|-------------|--|----------|---------|-------------|
| `fromObject(object)` |✅ | `(object)` | `TCPHttpCookie ` | Turns a saved cookie string obj into a TCPHttpCookie to be readded to TCPHttpCookieContainer|

## Class: TCPHttpCookieContainer
This class is a custom cookie container to be used with the TCPHttpClient

| Method | Parameters | Returns | Description |
|-------------|------------|---------|-------------|
| `addCookie(cookie,url,true)` | `(TCPHttpCookie, null, true)` | `void` | Allows addition of saved TCPHttpCookies reformatted with TCPHttpCookie.fromObject()(see above) to be readded to a new cookiecontainer within a client |
| `getAllCookies()`  | `()` | `TCPHttpCookie[]` | Exports all saved cookies. Can be stringified and saved to restore cookie sessions in a new client using fromObject() and addCookie() |