import fetch from 'omni-fetch';
import 'isomorphic-fetch';

export type IPretendDecoder = (response: Response) => Promise<any>;
export type IPretendRequest = { url: string, options: RequestInit };
export type IPretendRequestInterceptor = (request: IPretendRequest) => IPretendRequest;

interface IPretendConfiguration {
  baseUrl: string;
  decoder: IPretendDecoder;
  requestInterceptors: IPretendRequestInterceptor[];
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

async function execute(config: IPretendConfiguration, method: string, tmpl: string, args: any[], sendBody: boolean,
    appendQuery: boolean): Promise<any> {
  const createUrlResult = buildUrl(tmpl, args, appendQuery);
  const url = createUrlResult[0];
  const queryOrBodyIndex = createUrlResult[1];
  const request = config.requestInterceptors
    .reduce<IPretendRequest>((data, interceptor) => interceptor(data), {
      url,
      options: {
        method,
        headers: {},
        body: sendBody ? JSON.stringify(args[appendQuery ? queryOrBodyIndex + 1 : queryOrBodyIndex]) : undefined
      }
    });
  const response = await fetch(request.url, request.options);
  return config.decoder(response);
}

function decoratorFactory(method: string, url: string, sendBody: boolean, appendQuery: boolean): MethodDecorator {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value = async function(): Promise<any> {
      const config = this.__Pretend__ as IPretendConfiguration;
      return execute(config, method, `${config.baseUrl}${url}`, Array.prototype.slice.call(arguments), sendBody,
        appendQuery);
    };
    return descriptor;
  };
}

export class Pretend {

  private requestInterceptors: IPretendRequestInterceptor[] = [];
  private decoder: IPretendDecoder = Pretend.JsonDecoder;

  public static JsonDecoder: IPretendDecoder = (response: Response) => response.json();
  public static TextDecoder: IPretendDecoder = (response: Response) => response.text();

  public static builder(): Pretend {
    return new Pretend();
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

  public requestInterceptor(requestInterceptor: IPretendRequestInterceptor): this {
    this.requestInterceptors.push(requestInterceptor);
    return this;
  }

  public decode(decoder: IPretendDecoder): this {
    this.decoder = decoder;
    return this;
  }

  public target<T>(descriptor: {new(): T}, baseUrl: string): T {
    const instance = new descriptor();
    (instance as any).__Pretend__ = {
      baseUrl: baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl,
      decoder: this.decoder,
      requestInterceptors: this.requestInterceptors
    } as IPretendConfiguration;
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
