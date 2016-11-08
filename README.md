# pretend

[![GitHub license](https://img.shields.io/github/license/KnisterPeter/pretend.svg)](https://github.com/KnisterPeter/pretend)
[![Travis](https://img.shields.io/travis/KnisterPeter/pretend.svg)](https://travis-ci.org/KnisterPeter/pretend)
[![Coveralls branch](https://img.shields.io/coveralls/KnisterPeter/pretend/master.svg)](https://coveralls.io/github/KnisterPeter/pretend)
[![David](https://img.shields.io/david/KnisterPeter/pretend.svg)](https://david-dm.org/KnisterPeter/pretend)
[![David](https://img.shields.io/david/dev/KnisterPeter/pretend.svg)](https://david-dm.org/KnisterPeter/pretend#info=devDependencies&view=table)
[![npm](https://img.shields.io/npm/v/pretend.svg)](https://www.npmjs.com/package/pretend)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)

A decorator based http webservice client build with typescript (inspired bei feign).

## Features

* Handle REST based webservices
* Configure a decoder (defaults to JSON)
* Request interceptors
* Basic authentication
* Request parameters (currently on GET requests)

## Usage

### Installation

Install as npm package:

```sh
npm install pretend --save
```

### API

```js
class Test {

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

## Future ideas / Roadmap

* Named parameters
