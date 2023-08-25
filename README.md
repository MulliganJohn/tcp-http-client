# TCP-Http-Client

This is a basic http client written in node.js. It uses the built in tls and net modules to send http requests. The client has built in socket pooling, a built in cookie container that can be turned on or off, and also supports using a proxy.

# Install

`npm install tcp-http-client`

# Example Usage

This example will send an HTTP POST request to www.example.com. It creates the TCPHttpClient, and then creates a request to be sent by the client. It adds headers and content to the request, then sends the request / receives and then logs the response.

```javascript
const client = new TCPHttpClient();
const request = new TCPHttpRequest(new URL("https://www.example.com"), TCPHttpMethod.POST);
request.addHeader("name", "value");
request.addContent("Example Content", "text/plain");
const response = await client.sendRequest(request); //returns a promise
console.log(response.content.toString()); //response.content will be a byte[] by default. It does not automatically decode encoded data.
client.dispose(); //Make sure to dispose of the client when finished using.
```

# API

Work in Progress.