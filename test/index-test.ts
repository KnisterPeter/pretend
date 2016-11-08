import { assert } from 'chai';
import * as nock from 'nock';

import { Pretend, Get, Post, Put, Delete } from '../src';

/* tslint:disable */
class Test {
  @Get('/path/{id}')
  public async get(id: string) {}
  @Post('/path')
  public async post(body: any) {}
  @Put('/path')
  public async put() {}
  @Delete('/path')
  public async delete() {}
}
/* tslint:enable */

const response = {
  key: 'value'
};

describe('Pretend', () => {
  let test: Test;

  beforeEach(() => {
    test = Pretend.builder().target(Test, 'http://host:port/');
  });

  it('should call a get method', async () => {
    nock('http://host:port/').get('/path/id').reply(200, response);
    assert.deepEqual(await test.get('id'), response);
  });

  it('should call a post method', async () => {
    nock('http://host:port/').post('/path', {response}).reply(200, response);
    assert.deepEqual(await test.post({response}), response);
  });

  it('should call a put method', async () => {
    test = Pretend.builder().target(Test, 'http://host:port');
    nock('http://host:port/').put('/path').reply(200, response);
    assert.deepEqual(await test.put(), response);
  });

  it('should call a delete method', async () => {
    nock('http://host:port/').delete('/path').reply(200, response);
    assert.deepEqual(await test.delete(), response);
  });

  it('should throw on error', async () => {
    nock('http://host:port/').delete('/path').replyWithError('server-fail');
    try {
      await test.delete();
      assert.fail('should throw');
    } catch (e) {
      // Ignore here
    }
  });

  it('should return content based on decoder configuration', async () => {
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

    assert.isTrue(decoderCalled, 'The decoder should be called');
    assert.equal(text, 'some-string');
  });

  it('should use basic auth if configured', async () => {
    /* tslint:disable */
    class Api {
      @Get('/')
      async get() {};
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

    assert.deepEqual(repsponse, {});
  });
});
