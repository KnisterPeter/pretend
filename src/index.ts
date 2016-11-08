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

async function execute(config: IPretendConfiguration, method: string, tmpl: string, args: any[]): Promise<any> {
  const urlData = createUrl(tmpl, args);
  const request = config.requestInterceptors
    .reduce<IPretendRequest>((data, interceptor) => interceptor(data), {
      url: urlData[0],
      options: {
        method,
        headers: {},
        body: JSON.stringify(args[urlData[1]])
      }
    });
  const response = await fetch(request.url, request.options);
  return config.decoder(response);
}

function decoratorFactory(method: string, url: string): MethodDecorator {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value = async function(): Promise<any> {
      const config = this.__Pretend__ as IPretendConfiguration;
      return execute(config, method, `${config.baseUrl}${url}`, Array.prototype.slice.call(arguments));
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

export function Get(url: string): MethodDecorator {
  return decoratorFactory('GET', url);
}

export function Post(url: string): MethodDecorator {
  return decoratorFactory('POST', url);
}

export function Put(url: string): MethodDecorator {
  return decoratorFactory('PUT', url);
}

export function Delete(url: string): MethodDecorator {
  return decoratorFactory('DELETE', url);
}
