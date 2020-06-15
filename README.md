# pretend

[![npm](https://img.shields.io/npm/v/pretend.svg)](https://www.npmjs.com/package/pretend)
[![GitHub license](https://img.shields.io/github/license/KnisterPeter/pretend.svg)](https://github.com/KnisterPeter/pretend)
![build](https://github.com/KnisterPeter/pretend/workflows/build/badge.svg?branch=master)
[![codecov](https://codecov.io/gh/KnisterPeter/pretend/branch/master/graph/badge.svg)](https://codecov.io/gh/KnisterPeter/pretend)
[![renovate badge](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovateapp.com/)

A decorator based http webservice client build with typescript (inspired bei [feign](https://github.com/OpenFeign/feign)).

## Features

- Handle REST based webservices
- Configure a decoder (defaults to JSON)
- Generic request/response interceptor chain
- Basic authentication
- Request parameters (currently on GET requests)
- Custom headers per method

## Usage

### Installation

Install as npm package:

```sh
npm install pretend --save
```

**Note:** To work on node.js (server-side) the `fetch` must be polyfilled. This could easy be done importing `isomorphic-fetch`.

### API

```js
class Test {

  @Headers('Accept: application/json')
  @Get('/path/{id}', true)
  public async get(id: string, parameters: any) {}

  @Post('/path')
  public async post(body: any) {}

  @Post('/path')
  public async post(@FormData('name') blob: any) {}

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
const client = Pretend.builder()
  .decoder(Pretend.TextDecoder)
  .target(Test, 'http://host:port/');
```

```js
// Configure basic authentication
const client = Pretend.builder()
  .basicAuthentication('user', 'pass')
  .target(Test, 'http://host:port/');
```

```js
// Configure a request interceptor
const client = Pretend.builder()
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
const client = Pretend.builder()
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

### Data Mappers

DataMappers could be used to map response structures to TypeScript classes.
This is done using the `@ResponseType` decorator.

```ts
class User {
  public name: string;

  constuctor(data: { name: string }) {
    this.name = data.name;
  }
}

class API {
  @Get('/path/{id}')
  @ResponseType(User)
  public async loadUser(id: string): Promise<User> {
    /*
     * `/path/{id}` returns a JSON like this from the server:
     *
     *  {
     *    name: 'some string'
     *  }
     */
  }
}

const client = Pretend.builder().target(API, 'http://host:port/');
const result: User = await client.loadUser(1);
```

There is a second parameter to the `@ResponseType` decorator which is a transform function.
The input is the server response, the output need to match the class constructor parameters.

**Note**: The constructor parameters are always an array!

```ts
class User {
  public get name(): string {
    return this.data.name;
  }

  constuctor(private data: { name: string }) {}
}

class API {
  @Get('/path/{id}')
  @ResponseType(User, (data) => [
    { name: `${data.firstname} ${data.lastname}` }
  ])
  public async loadUser(id: string): Promise<User> {
    /*
     * `/path/{id}` returns a JSON like this from the server:
     *
     *  {
     *    firstname: 'John',
     *    lastname: 'Doe'
     *  }
     */
  }
}

const client = Pretend.builder().target(API, 'http://host:port/');
const result: User = await client.loadUser(1);
```

## Future ideas / Roadmap

- Named parameters
