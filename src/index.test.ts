// tslint:disable:no-implicit-dependencies
import 'isomorphic-fetch';
import 'isomorphic-form-data';
import nock from 'nock';
import { FormEncoding, ResponseType } from './decorators';
import {
  Delete,
  FormData,
  Get,
  Headers,
  Patch,
  Post,
  Pretend,
  Put
} from './index';

class UserClass {
  public static transform({
    firstName,
    lastName
  }: {
    firstName: string;
    lastName: string;
  }): ConstructorParameters<typeof UserClass> {
    return [{ user: `${firstName} ${lastName}` }];
  }

  public readonly user: string;

  constructor(data: { user: string }) {
    this.user = data.user;
  }
}

interface Test {
  getSimple(): Promise<any>;
  get(_id: string): Promise<any>;
  getWithQuery(_id: string, _parameters: any): Promise<any>;
  getWithHeader(): Promise<any>;
  post(_body: any): Promise<any>;
  postWithQueryAndBody(_query: any, _body: any): Promise<any>;
  postWithFormData(_formData: any): Promise<any>;
  postWithFormDataAndQuery(_query: any, _formData: any): Promise<any>;
  postWithEmptyFormDataAndQuery(_query: any, _formData: any): Promise<any>;
  postWithUrlEncodedBody(_query: any, _body: any): Promise<any>;
  put(): Promise<any>;
  putWithQuery(_parameters: any): Promise<any>;
  delete(_id: string): Promise<any>;
  deleteBody(_id: string, _body: object): Promise<any>;
  deleteWithQuery(_id: string, _query: object): Promise<any>;
  patchBody(_id: string, _body: object): Promise<any>;
  withResponseType(): Promise<UserClass>;
  withResponseTypeAndTransform(): Promise<UserClass>;
}

class TestImpl implements Test {
  @Get('/path', true)
  public getSimple(): any {
    /* */
  }
  @Get('/path/{id}')
  public get(_id: string): any {
    /* */
  }
  @Get('/path/{id}', true)
  public getWithQuery(_id: string, _parameters: any): any {
    /* */
  }
  @Headers('Accept: accept')
  @Get('/with/header')
  public getWithHeader(): any {
    /* */
  }
  @Post('/path')
  public post(_body: any): any {
    /* */
  }
  @Post('/path', true)
  public postWithQueryAndBody(): any {
    /* */
  }
  @Post('/path/withFormData', true)
  public postWithFormData(@FormData('name') _formData: any): any {
    /* */
  }
  @Post('/path/withFormData', true)
  public postWithFormDataAndQuery(
    _query: any,
    @FormData('name') _formData: any
  ): any {
    /* */
  }
  @Post('/path/withFormData', true)
  public postWithEmptyFormDataAndQuery(
    _query: any,
    @FormData('name') _formData: any
  ): any {
    /* */
  }
  @Post('/path/withUrlEncodedBody', true)
  public postWithUrlEncodedBody(_query: any, @FormEncoding _body: any): any {
    /* */
  }
  @Put('/path')
  public put(): any {
    /* */
  }
  @Put('/path', true)
  public putWithQuery(_parameters: any): any {
    /* */
  }
  @Delete('/path/:id')
  public delete(_id: string): any {
    /* */
  }
  @Delete('/path/:id', true)
  public deleteBody(_id: string, _body: object): any {
    /* */
  }
  @Delete('/path/:id', false, true)
  public deleteWithQuery(_id: string, _query: object): any {
    /* */
  }
  @Patch('/path/:id')
  public patchBody(_id: string, _body: object): any {
    /* */
  }
  @Get('/some/url')
  @ResponseType(UserClass)
  public withResponseType(): any {
    /* */
  }
  @Get('/some/other/url')
  @ResponseType(UserClass, UserClass.transform)
  public withResponseTypeAndTransform(): any {
    /* */
  }
}

const mockResponse = {
  key: 'value'
};

function setup(): Test {
  return Pretend.builder().target(TestImpl, 'http://host:port/');
}

test('Pretend should call a get method without any parameter or query', async () => {
  const test = setup();
  nock('http://host:port/').get('/path').reply(200, mockResponse);

  const response = await test.getSimple();

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a get method', async () => {
  const test = setup();
  nock('http://host:port/').get('/path/id').reply(200, mockResponse);

  const response = await test.get('id');

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a get method with query parameters', async () => {
  const test = setup();
  nock('http://host:port/').get('/path/id?a=b&c=d').reply(200, mockResponse);

  const response = await test.getWithQuery('id', { a: 'b', c: 'd' });

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a get method and add a custom header', async () => {
  const test = setup();
  nock('http://host:port/', {
    reqheaders: {
      accept: 'accept'
    }
  })
    .get('/with/header')
    .reply(200, mockResponse);

  const response = await test.getWithHeader();

  expect(response).toEqual(mockResponse);
});

test('Pretend should throw on wrong custom header format', async () => {
  /* tslint:disable */
  class Api {
    @Headers('syntactically-wrong')
    @Get('/path')
    get(): Promise<string> {
      return undefined as any;
    }
  }
  /* tslint:enable */
  const test = Pretend.builder().target(Api, 'http://host:port/');

  try {
    await test.get();
    fail('should throw');
  } catch (e) {
    // all good, nothing to do
  }
});

test('Pretend should call a post method', async () => {
  const test = setup();
  nock('http://host:port/')
    .post('/path', { mockResponse })
    .reply(200, mockResponse);

  const response = await test.post({ mockResponse });

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a post method with query and body', async () => {
  const test = setup();
  nock('http://host:port/')
    .post('/path?query=param', { mockResponse })
    .reply(200, mockResponse);

  const response = await test.postWithQueryAndBody(
    { query: 'param' },
    { mockResponse }
  );

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a post method with FormData', async () => {
  const test = setup();
  nock('http://host:port/', {
    reqheaders: {
      'Content-Type': /^multipart\/form-data/
    }
  })
    .post('/path/withFormData', /Content-Disposition: form-data; name="name"/)
    .reply(200, mockResponse);

  const response = await test.postWithFormData(
    Buffer.alloc(10).toString('UTF-8')
  );

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a post method with FormData and query', async () => {
  const test = setup();
  nock('http://host:port/', {
    reqheaders: {
      'Content-Type': /^multipart\/form-data/
    }
  })
    .post(
      '/path/withFormData?query=params',
      /Content-Disposition: form-data; name="name"/
    )
    .reply(200, mockResponse);

  const response = await test.postWithFormDataAndQuery(
    { query: 'params' },
    Buffer.alloc(10).toString('UTF-8')
  );

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a post method with empty FormData and query', async () => {
  const test = setup();
  nock('http://host:port/', {
    reqheaders: {
      'Content-Type': /^multipart\/form-data/
    }
  })
    .post('/path/withFormData?query=params', undefined)
    .reply(200, mockResponse);

  const response = await test.postWithEmptyFormDataAndQuery(
    { query: 'params' },
    undefined
  );

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a post method and form-encode the body', async () => {
  const test = setup();
  nock('http://host:port/')
    .post('/path/withUrlEncodedBody?query=params', 'p1=d1&p2=a%20b')
    .reply(200, mockResponse);

  const response = await test.postWithUrlEncodedBody(
    { query: 'params' },
    { p1: 'd1', p2: 'a b' }
  );

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a put method', async () => {
  const test: Test = Pretend.builder().target(TestImpl, 'http://host:port');
  nock('http://host:port/').put('/path').reply(200, mockResponse);

  const response = await test.put();

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a put method with query parameters', async () => {
  const test = setup();
  nock('http://host:port/').put('/path?query=param').reply(200, mockResponse);

  const response = await test.putWithQuery({ query: 'param' });

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a delete method', async () => {
  const test = setup();
  nock('http://host:port/').delete('/path/id').reply(200, mockResponse);

  const response = await test.delete('id');

  expect(response).toEqual(mockResponse);
});

test('Pretend should throw on error', async () => {
  const test = setup();
  nock('http://host:port/').delete('/path/id').replyWithError('server-fail');

  try {
    await test.delete('id');
    fail('should throw');
  } catch (e) {
    // all good, nothing to do
  }
});

test('Pretend should call a delete method and send a body', async () => {
  const test = setup();
  nock('http://host:port/')
    .delete('/path/id', { data: 'data' })
    .reply(200, mockResponse);

  const response = await test.deleteBody('id', { data: 'data' });

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a delete method and append query parameters', async () => {
  const test = setup();
  nock('http://host:port/')
    .delete('/path/id?param=value')
    .reply(200, mockResponse);

  const response = await test.deleteWithQuery('id', { param: 'value' });

  expect(response).toEqual(mockResponse);
});

test('Pretend should call a patch method and send a body', async () => {
  const test = setup();
  nock('http://host:port/')
    .patch('/path/id', { data: 'data' })
    .reply(200, mockResponse);

  const response = await test.patchBody('id', { data: 'data' });

  expect(response).toEqual(mockResponse);
});

test('Pretend should return content based on decoder configuration', async () => {
  /* tslint:disable */
  class Api {
    @Get('/path')
    get(): Promise<string> {
      return undefined as any;
    }
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

  const text = await api.get();

  expect(decoderCalled).toBeTruthy();
  expect(text).toBe('some-string');
});

test('Pretend should use basic auth if configured', async () => {
  /* tslint:disable */
  class Api {
    @Get('/')
    get(): Promise<any> {
      return undefined as any;
    }
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

  const response = await api.get();

  expect(response).toEqual({});
});

test('Pretend should return from the interceptor', async () => {
  nock('http://host:port/')
    .get('/path/id')
    .reply(200, mockResponse)
    .get('/path/id')
    .reply(500, {});

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
  await test.get('id');
  const response = await test.get('id');

  // second should be return from the interceptor (nock would fail)
  expect(response).toEqual(mockResponse);
});

test('Pretend should reset per-request data after each request', async () => {
  const test = setup();
  nock('http://host:port/').get('/with/header').reply(200, mockResponse);

  await test.getWithHeader();

  expect((test as any).__Pretend__.perRequest).toBeUndefined();
});

test('Pretend should reset per-request data after error requests', async () => {
  const test = setup();
  nock('http://host:port/').get('/with/header').replyWithError('failed');

  try {
    await test.getWithHeader();
  } catch (e) {
    expect((test as any).__Pretend__.perRequest).toBeUndefined();
  }
});

test('Pretend should return from the interceptor with multiple chain calls', async () => {
  nock('http://host:port/')
    .get('/path/id')
    .reply(200, mockResponse)
    .get('/path/id')
    .reply(500, {});

  const test: Test = Pretend.builder()
    .interceptor((chain, request) => {
      return chain(request).then(() => chain(request));
    })
    .target(TestImpl, 'http://host:port/');

  const response = await test.get('id');

  expect(response).toEqual(mockResponse);
});

test('Pretend should map responses to a given result type', async () => {
  const scope = nock('http://host:port/')
    .get('/some/url')
    .reply(200, { user: 'name' });

  const test: Test = Pretend.builder().target(TestImpl, 'http://host:port/');
  const response = await test.withResponseType();

  expect(response).toBeInstanceOf(UserClass);
  expect(response.user).toBe('name');

  scope.done();
});

test('Pretend should map responses to a given result type using a transform', async () => {
  const scope = nock('http://host:port/')
    .get('/some/other/url')
    .reply(200, { firstName: 'firstname', lastName: 'lastname' });

  const test: Test = Pretend.builder().target(TestImpl, 'http://host:port/');
  const response = await test.withResponseTypeAndTransform();

  expect(response).toBeInstanceOf(UserClass);
  expect(response.user).toBe('firstname lastname');

  scope.done();
});
