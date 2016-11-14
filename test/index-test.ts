import test from 'ava';
import * as nock from 'nock';

import { Pretend, Get, Post, Put, Delete } from '../src';

/* tslint:disable */
class Test {
  @Get('/path/{id}')
  public async get(id: string): Promise<any> {}
  @Get('/path/{id}', true)
  public async getWithQuery(id: string, parameters: any): Promise<any> {}
  @Post('/path')
  public async post(body: any): Promise<any> {}
  @Put('/path')
  public async put(): Promise<any> {}
  @Delete('/path/:id')
  public async delete(id: string): Promise<any> {}
}
/* tslint:enable */

const response = {
  key: 'value'
};

function setup(): Test {
  return Pretend.builder().target(Test, 'http://host:port/');
}

test('Pretend should call a get method', async t => {
  const test = setup();
  nock('http://host:port/').get('/path/id').reply(200, response);
  t.deepEqual(await test.get('id'), response);
});

test('Pretend should call a get method with query parameters', async t => {
  const test = setup();
  nock('http://host:port/').get('/path/id?a=b&c=d').reply(200, response);
  t.deepEqual(await test.getWithQuery('id', {a: 'b', c: 'd'}), response);
});

test('Pretend should call a post method', async t => {
  const test = setup();
  nock('http://host:port/').post('/path', {response}).reply(200, response);
  t.deepEqual(await test.post({response}), response);
});

test('Pretend should call a put method', async t => {
  const test = Pretend.builder().target(Test, 'http://host:port');
  nock('http://host:port/').put('/path').reply(200, response);
  t.deepEqual(await test.put(), response);
});

test('Pretend should call a delete method', async t => {
  const test = setup();
  nock('http://host:port/').delete('/path/id').reply(200, response);
  t.deepEqual(await test.delete('id'), response);
});

test('Pretend should throw on error', async t => {
  const test = setup();
  nock('http://host:port/').delete('/path/id').replyWithError('server-fail');
  try {
    await test.delete('id');
    t.fail('should throw');
  } catch (e) {
    // Ignore here
  }
});

test('Pretend should return content based on decoder configuration', async t => {
  /* tslint:disable */
  class Api {
    @Get('/path')
    async get(): Promise<string> { return undefined };
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

  t.true(decoderCalled, 'The decoder should be called');
  t.is(text, 'some-string');
});

test('Pretend should use basic auth if configured', async t => {
  /* tslint:disable */
  class Api {
    @Get('/')
    async get(): Promise<any> {};
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
  const repsponse = await api.get();

  t.deepEqual(repsponse, {});
});

test('Pretend should return from the interceptor', async t => {
  nock('http://host:port/')
    .get('/path/id').reply(200, response)
    .get('/path/id').reply(500, {});

  let firstReponse: any = undefined;
  const test = Pretend.builder()
    .interceptor((chain, request) => {
      if (!firstReponse) {
        firstReponse = chain(request);
      }
      return firstReponse;
    })
    .target(Test, 'http://host:port/');
  // First call gets through
  await test.get('id');
  // Second should be return from the interceptor (nock would fail)
  t.deepEqual(await test.get('id'), response);
});
