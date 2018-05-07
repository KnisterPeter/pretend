// tslint:disable:no-implicit-dependencies
import test from 'ava';
import 'isomorphic-fetch';
import 'isomorphic-form-data';
import * as nock from 'nock';

import { Delete, Get, Headers, Post, Pretend, Put, Patch, FormData } from '../src';

interface Test {
  getSimple(): Promise<any>;
  get(_id: string): Promise<any>;
  getWithQuery(_id: string, _parameters: any): Promise<any>;
  getWithHeader(): Promise<any>;
  post(_body: any): Promise<any>;
  postWithQueryAndBody(_query: any, _body: any): Promise<any>;
  postWithFormData(_formData: any): Promise<any>;
  postWithFormDataAndQuery(_query: any, _formData: any): Promise<any>;
  put(): Promise<any>;
  putWithQuery(_parameters: any): Promise<any>;
  delete(_id: string): Promise<any>;
  deleteBody(_id: string, _body: object): Promise<any>;
  deleteWithQuery(_id: string, _query: object): Promise<any>;
  patchBody(_id: string, _body: object): Promise<any>;
}

class TestImpl implements Test {
  @Get('/path', true)
  public getSimple(): any { /* */ }
  @Get('/path/{id}')
  public get(_id: string): any { /* */ }
  @Get('/path/{id}', true)
  public getWithQuery(_id: string, _parameters: any): any { /* */ }
  @Headers('Accept: accept')
  @Get('/with/header')
  public getWithHeader(): any { /* */ }
  @Post('/path')
  public post(_body: any): any { /* */ }
  @Post('/path', true)
  public postWithQueryAndBody(): any { /* */ }
  @Post('/path/withFormData', true)
  public postWithFormData(@FormData('name') _formData: any): any { /* */ }
  @Post('/path/withFormData', true)
  public postWithFormDataAndQuery(_query: any, @FormData('name') _formData: any): any { /* */ }
  @Put('/path')
  public put(): any { /* */ }
  @Put('/path', true)
  public putWithQuery(_parameters: any): any { /* */ }
  @Delete('/path/:id')
  public delete(_id: string): any { /* */ }
  @Delete('/path/:id', true)
  public deleteBody(_id: string, _body: object): any { /* */ }
  @Delete('/path/:id', false, true)
  public deleteWithQuery(_id: string, _query: object): any { /* */ }
  @Patch('/path/:id')
  public patchBody(_id: string, _body: object): any { /* */ }
}

const mockResponse = {
  key: 'value'
};

function setup(): Test {
  return Pretend.builder().target(TestImpl, 'http://host:port/');
}

test('Pretend should call a get method without any parameter or query', t => {
  const test = setup();
  nock('http://host:port/').get('/path').reply(200, mockResponse);
  return test.getSimple()
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a get method', t => {
  const test = setup();
  nock('http://host:port/').get('/path/id').reply(200, mockResponse);
  return test.get('id')
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a get method with query parameters', t => {
  const test = setup();
  nock('http://host:port/').get('/path/id?a=b&c=d').reply(200, mockResponse);
  return test.getWithQuery('id', {a: 'b', c: 'd'})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a get method and add a custom header', t => {
  const test = setup();
  nock('http://host:port/', {
      reqheaders: {
        accept: 'accept'
      }
    }).get('/with/header').reply(200, mockResponse);
  return test.getWithHeader()
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should throw on wrong custom header format', t => {
  /* tslint:disable */
  class Api {
    @Headers('syntactically-wrong')
    @Get('/path')
    get(): Promise<string> { return undefined as any; };
  }
  /* tslint:enable */
  const test = Pretend.builder()
    .target(Api, 'http://host:port/');

  return test.get()
    .then(() => {
      t.fail('should throw');
    })
    .catch(() => {
      t.pass();
    });
});

test('Pretend should call a post method', t => {
  const test = setup();
  nock('http://host:port/').post('/path', {mockResponse}).reply(200, mockResponse);
  return test.post({mockResponse})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a post method with query and body', t => {
  const test = setup();
  nock('http://host:port/').post('/path?query=param', {mockResponse}).reply(200, mockResponse);
  return test.postWithQueryAndBody({ query: 'param' }, {mockResponse})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a post method with FormData', t => {
  const test = setup();
  nock('http://host:port/', {
      reqheaders: {
        'Content-Type': /^multipart\/form-data/
      }
    })
    .post('/path/withFormData', /Content-Disposition: form-data; name="name"/)
    .reply(200, mockResponse);
  return test.postWithFormData(Buffer.alloc(10).toString('UTF-8'))
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a post method with FormData and query', t => {
  const test = setup();
  nock('http://host:port/', {
      reqheaders: {
        'Content-Type': /^multipart\/form-data/
      }
    })
    .post('/path/withFormData?query=params', /Content-Disposition: form-data; name="name"/)
    .reply(200, mockResponse);
  return test.postWithFormDataAndQuery({query: 'params'}, Buffer.alloc(10).toString('UTF-8') )
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a put method', t => {
  const test: Test = Pretend.builder().target(TestImpl, 'http://host:port');
  nock('http://host:port/').put('/path').reply(200, mockResponse);
  return test.put()
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a put method with query parameters', t => {
  const test = setup();
  nock('http://host:port/').put('/path?query=param').reply(200, mockResponse);
  return test.putWithQuery({query: 'param'})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a delete method', t => {
  const test = setup();
  nock('http://host:port/').delete('/path/id').reply(200, mockResponse);
  return test.delete('id')
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should throw on error', t => {
  const test = setup();
  nock('http://host:port/').delete('/path/id').replyWithError('server-fail');
  return test.delete('id')
    .then(() => {
      t.fail('should throw');
    })
    .catch(() => {
      t.pass();
    });
});

test('Pretend should call a delete method and send a body', t => {
  const test = setup();
  nock('http://host:port/').delete('/path/id', {data: 'data'}).reply(200, mockResponse);
  return test.deleteBody('id', {data: 'data'})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a delete method and append query parameters', t => {
  const test = setup();
  nock('http://host:port/').delete('/path/id?param=value').reply(200, mockResponse);
  return test.deleteWithQuery('id', {param: 'value'})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should call a patch method and send a body', t => {
  const test = setup();
  nock('http://host:port/').patch('/path/id', {data: 'data'}).reply(200, mockResponse);
  return test.patchBody('id', {data: 'data'})
    .then(response => {
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should return content based on decoder configuration', t => {
  /* tslint:disable */
  class Api {
    @Get('/path')
    get(): Promise<string> { return undefined as any; };
  }
  /* tslint:enable */
  nock('http://host:port/').get('/path').reply(200, 'some-string');
  let decoderCalled = false;
  const api = Pretend.builder()
    .decode((res: Response) => {
      decoderCalled = true;
      return res.text();
    })
    .target(Api, 'http://host:port/');

  return api.get()
    .then(text => {
      t.true(decoderCalled, 'The decoder should be called');
      t.is(text, 'some-string');
    });
});

test('Pretend should use basic auth if configured', t => {
  /* tslint:disable */
  class Api {
    @Get('/')
    get(): Promise<any> { return undefined as any; };
  }
  /* tslint:enable */
  nock('http://host:port/', {
      reqheaders: {
        Authorization: 'Basic QWxhZGRpbjpPcGVuU2VzYW1l'
      }
    })
    .get('/')
    .reply(200, '{}');

  const api = Pretend.builder()
    .basicAuthentication('Aladdin', 'OpenSesame')
    .target(Api, 'http://host:port');
  return api.get()
    .then(response => {
      t.deepEqual(response, {});
    });
});

test('Pretend should return from the interceptor', t => {
  nock('http://host:port/')
    .get('/path/id').reply(200, mockResponse)
    .get('/path/id').reply(500, {});

  let firstReponse: any = undefined;
  const test: Test = Pretend.builder()
    .interceptor((chain, request) => {
      if (!firstReponse) {
        firstReponse = chain(request);
      }
      return firstReponse;
    })
    .target(TestImpl, 'http://host:port/');
  // first call gets through
  return test.get('id')
    .then(() => test.get('id'))
    .then(response => {
      // second should be return from the interceptor (nock would fail)
      t.deepEqual(response, mockResponse);
    });
});

test('Pretend should reset per-request data after each request', t => {
  const test = setup();
  nock('http://host:port/').get('/with/header').reply(200, mockResponse);
  return test.getWithHeader()
    .then(() => {
      t.is((test as any).__Pretend__.perRequest, undefined);
    });
});

test('Pretend should reset per-request data after error requests', t => {
  const test = setup();
  nock('http://host:port/').get('/with/header').replyWithError('failed');
  return test.getWithHeader()
    .catch(() => {
      t.is((test as any).__Pretend__.perRequest, undefined);
    });
});
