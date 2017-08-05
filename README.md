# pretend

[![GitHub license](https://img.shields.io/github/license/KnisterPeter/pretend.svg)](https://github.com/KnisterPeter/pretend)
[![Travis](https://img.shields.io/travis/KnisterPeter/pretend.svg)](https://travis-ci.org/KnisterPeter/pretend)
[![Coveralls branch](https://img.shields.io/coveralls/KnisterPeter/pretend/master.svg)](https://coveralls.io/github/KnisterPeter/pretend)
[![npm](https://img.shields.io/npm/v/pretend.svg)](https://www.npmjs.com/package/pretend)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)
[![Greenkeeper badge](https://badges.greenkeeper.io/KnisterPeter/pretend.svg)](https://greenkeeper.io/)

A decorator based http webservice client build with typescript (inspired bei [feign](https://github.com/OpenFeign/feign)).

## Features

* Handle REST based webservices
* Configure a decoder (defaults to JSON)
* Generic request/response interceptor chain
* Basic authentication
* Request parameters (currently on GET requests)
* Custom headers per method

## Usage

### Installation

Install as npm package:

```sh
npm install pretend --save
```

### API

```js
class Test {

  @Headers('Accept: application/json')
  @Get('/path/{id}', true)
  public async get(id: string, parameters: any) {}

  @Post('/path')
  public async post(body: any) {}

  @Put('/path')
  public async put() {}

  @Delete('/path/:id')
  public async delete(id: string) {}

}

async function call() {
  const client = Pretend
                  .builder()
                  .target(Test, 'http://host:port/');
  const result = await client.get('some-id', {'name': 'value'});
}

// Executes a GET request to 'http://host:port/path/some-id?name=value'
call();

```

Decoders, basicAuthentication and requestInterceptors are all special forms
of the more generic interceptors which could be chained per request/response.

```js
  // Configure a text based decoder
  const client = Pretend
                  .builder()
                  .decoder(Pretend.TextDecoder)
                  .target(Test, 'http://host:port/');
```

```js
  // Configure basic authentication
  const client = Pretend
                  .builder()
                  .basicAuthentication('user', 'pass')
                  .target(Test, 'http://host:port/');
```


```js
  // Configure a request interceptor
  const client = Pretend
                  .builder()
                  .requestInterceptor((request) => {
                    request.options.headers['X-Custom-Header'] = 'value';
                    return request;
                  })
                  .target(Test, 'http://host:port/');
```

#### Interceptors

Multiple interceptors could be added to each builder. The order of interceptor
calls will result in a chain of calls like illistrated below:

```js
  // Configure a request interceptor
  const client = Pretend
                  .builder()
                  .interceptor(async (chain, request) => {
                    console.log('interceptor 1: request');
                    const response = await chain(request);
                    console.log('interceptor 1: response');
                    return response;
                  })
                  .interceptor(async (chain, request) => {
                    console.log('interceptor 2: request');
                    const response = await chain(request);
                    console.log('interceptor 2: response');
                    return response;
                  })
                  .target(Test, 'http://host:port/');
```

```text
             +---------------+    +---------------+
Request ---> |               | -> |               |
             | Interceptor 1 |    | Interceptor 2 | -> HTTP REST call
Response <-- |               | <- |               |
             +---------------+    +---------------+
```

This leads to the following console output:

```text
interceptor 1: request
interceptor 2: request
interceptor 2: response
interceptor 1: response
```

## Future ideas / Roadmap

* Named parameters
