import 'isomorphic-fetch';

export {Get, Post, Put, Delete, Headers} from './decorators';

export type IPretendDecoder = (response: Response) => Promise<any>;
export type IPretendRequest = { url: string, options: RequestInit };
export type IPretendRequestInterceptor = (request: IPretendRequest) => IPretendRequest;

export interface Interceptor {
  (chain: Chain, request: IPretendRequest): Promise<any>;
}

export interface Chain {
  (request: IPretendRequest): Promise<any>;
}

interface Instance {
  __Pretend__: {
    baseUrl: string;
    interceptors: Interceptor[];
    perRequest?: {
      headers?: {[name: string]: string[]};
    };
  };
}

function createUrl(url: string, args: any[]): [string, number] {
  let i = 0;
  return [url
    .split('/')
    .map(part => (part.startsWith(':') || part.startsWith('{')) && i <= args.length ? args[i++] : part)
    .join('/'), i];
}

function createQuery(parameters: any): string {
  return Object.keys(parameters)
    .reduce((query, name) => {
      return `${query}&${name}=${encodeURIComponent(parameters[name])}`;
    }, '')
    .replace(/^&/, '?');
}

function buildUrl(tmpl: string, args: any[], appendQuery: boolean): [string, number] {
  const [url, queryOrBodyIndex] = createUrl(tmpl, args);
  const query = createQuery(appendQuery ? args[queryOrBodyIndex] : {});
  return [`${url}${query}`, queryOrBodyIndex];
}

function prepareHeaders(instance: Instance): Headers {
  const headers = new Headers();
  const {perRequest} = instance.__Pretend__;
  if (perRequest && perRequest.headers) {
    Object.keys(perRequest.headers).forEach(name => {
      perRequest.headers![name].forEach(value => {
        headers.append(name, value);
      });
    });
  }
  return headers;
}

function chainFactory(interceptors: Interceptor[]): (request: IPretendRequest) => Promise<Response> {
  let i = 0;
  return function chainStep(request: IPretendRequest): Promise<Response> {
    return interceptors[i++](chainStep, request);
  };
}

function execute(instance: Instance, method: string, tmpl: string, args: any[], sendBody: boolean,
    appendQuery: boolean): Promise<any> {
  const createUrlResult = buildUrl(tmpl, args, appendQuery);
  const url = createUrlResult[0];
  const queryOrBodyIndex = createUrlResult[1];
  const headers = prepareHeaders(instance);
  const body = sendBody ? JSON.stringify(args[appendQuery ? queryOrBodyIndex + 1 : queryOrBodyIndex]) : undefined;

  const chain = chainFactory(instance.__Pretend__.interceptors);
  return chain({
    url,
    options: {
      method,
      headers,
      body
    }
  });
}

/**
 * @internal
 */
export function methodDecoratorFactory(method: string, url: string, sendBody: boolean,
    appendQuery: boolean): MethodDecorator {
  return (_target: Object, _propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value = function(this: Instance, ...args: any[]): Promise<any> {
      return execute(this, method, `${this.__Pretend__.baseUrl}${url}`, args, sendBody, appendQuery);
    };
    return descriptor;
  };
}

/**
 * @internal
 */
export function headerDecoratorFactory(headers: string|string[]): MethodDecorator {
  return (_target: Object, _propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    const originalFunction: (...args: any[]) => Promise<any> = descriptor.value;
    descriptor.value = function(this: Instance, ...args: any[]): Promise<any> {
      return Promise.resolve()
        .then(() => {
          this.__Pretend__.perRequest = {
            headers: (Array.isArray(headers) ? headers : [headers]).reduce((akku, header) => {
              const match = header.match(/([^:]+): *(.*)/);
              if (!match) {
                throw new Error(`Invalid header format for '${header}'`);
              }
              const [, name, value] = match;
              if (!akku[name]) {
                akku[name] = [];
              }
              akku[name].push(value);
              return akku;
            }, {} as {[name: string]: string[]})
          };
          return (originalFunction.apply(this, args) as Promise<any>)
            .then(result => {
              this.__Pretend__.perRequest = undefined;
              return result;
            })
            .catch(error => {
              this.__Pretend__.perRequest = undefined;
              throw error;
            });
        });
    };
    return descriptor;
  };
}

export class Pretend {

  private static FetchInterceptor: Interceptor =
    // tslint:disable-next-line
    (_chain: Chain, request: IPretendRequest) => fetch(request.url, request.options);
  public static JsonDecoder: IPretendDecoder = (response: Response) => response.json();
  public static TextDecoder: IPretendDecoder = (response: Response) => response.text();

  private interceptors: Interceptor[] = [];
  private decoder: IPretendDecoder = Pretend.JsonDecoder;

  public static builder(): Pretend {
    return new Pretend();
  }

  public interceptor(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  public requestInterceptor(requestInterceptor: IPretendRequestInterceptor): this {
    this.interceptors.push((chain: Chain, request: IPretendRequest) => {
      return chain(requestInterceptor(request));
    });
    return this;
  }

  public basicAuthentication(username: string, password: string): this {
    const usernameAndPassword = `${username}:${password}`;
    const auth = 'Basic '
      + (typeof (global as any).btoa !== 'undefined'
        ? (global as any).btoa(usernameAndPassword)
        : new Buffer(usernameAndPassword, 'binary').toString('base64'));
    this.requestInterceptor((request) => {
      (request.options.headers as Headers).set('Authorization', auth);
      return request;
    });
    return this;
  }

  public decode(decoder: IPretendDecoder): this {
    this.decoder = decoder;
    return this;
  }

  public target<T>(descriptor: {new(): T}, baseUrl: string): T {
    if (this.decoder) {
      // if we have a decoder, the first thing to do with a response is to decode it
      this.interceptors.push((chain: Chain, request: IPretendRequest) => {
        return chain(request).then(response => this.decoder(response));
      });
    }
    // this is the end of the request chain
    this.interceptors.push(Pretend.FetchInterceptor);

    const instance = new descriptor() as T & Instance;
    instance.__Pretend__ = {
      baseUrl: baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl,
      interceptors: this.interceptors
    };
    return instance;
  }

}
