import fetch from 'omni-fetch';
import 'isomorphic-fetch';

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
  const createUrlResult = createUrl(tmpl, args);
  const url = createUrlResult[0];
  const queryOrBodyIndex = createUrlResult[1];
  const query = createQuery(appendQuery ? args[queryOrBodyIndex] : {});
  return [`${url}${query}`, queryOrBodyIndex];
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
  const body = sendBody ? JSON.stringify(args[appendQuery ? queryOrBodyIndex + 1 : queryOrBodyIndex]) : undefined;

  const chain = chainFactory(instance.__Pretend__.interceptors);
  return chain({
    url,
    options: {
      method,
      headers: {},
      body
    }
  });
}

function decoratorFactory(method: string, url: string, sendBody: boolean, appendQuery: boolean): MethodDecorator {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value = async function(this: Instance): Promise<any> {
      return execute(this, method, `${this.__Pretend__.baseUrl}${url}`,
        Array.prototype.slice.call(arguments), sendBody, appendQuery);
    };
    return descriptor;
  };
}

export class Pretend {

  private interceptors: Interceptor[] = [];
  private decoder: IPretendDecoder = Pretend.JsonDecoder;

  private static FetchInterceptor: Interceptor =
    async (chain: Chain, request: IPretendRequest) => fetch(request.url, request.options);
  public static JsonDecoder: IPretendDecoder = (response: Response) => response.json();
  public static TextDecoder: IPretendDecoder = (response: Response) => response.text();

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
      + (typeof btoa !== 'undefined'
        ? btoa(usernameAndPassword)
        : new Buffer(usernameAndPassword, 'binary').toString('base64'));
    this.requestInterceptor((request) => {
      (request.options.headers as any)['Authorization'] = auth;
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
      // If we have a decoder, the first thing to do with a response is to decode it
      this.interceptors.push(async (chain: Chain, request: IPretendRequest) => {
        const response = await chain(request);
        return this.decoder(response);
      });
    }
    // This is the end of the request chain
    this.interceptors.push(Pretend.FetchInterceptor);

    const instance = new descriptor() as T & Instance;
    instance.__Pretend__ = {
      baseUrl: baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl,
      interceptors: this.interceptors
    };
    return instance;
  }

}

export function Get(url: string, appendQuery?: boolean): MethodDecorator {
  if (typeof appendQuery === 'undefined') {
    appendQuery = false;
  }
  return decoratorFactory('GET', url, false, appendQuery);
}

export function Post(url: string): MethodDecorator {
  return decoratorFactory('POST', url, true, false);
}

export function Put(url: string): MethodDecorator {
  return decoratorFactory('PUT', url, true, false);
}

export function Delete(url: string): MethodDecorator {
  return decoratorFactory('DELETE', url, false, false);
}
