export {
  Delete,
  FormData,
  FormEncoding,
  Get,
  Headers,
  Patch,
  Post,
  Put
} from './decorators';

export type IPretendDecoder = (response: Response) => Promise<any>;
export type IPretendRequest = { url: string; options: RequestInit };
export type IPretendRequestInterceptor = (
  request: IPretendRequest
) => IPretendRequest;

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
      headers?: Record<string, string[]>;
    };
    parameters: {
      [method: string]: FormParameter[];
    };
    dataMapper?(data: any): any;
  };
}

type FormParameter = FormDataParameter | FormEncodingParameter;

interface FormDataParameter {
  type: 'FormData';
  name: string;
  parameter: number;
}

interface FormEncodingParameter {
  type: 'FormEncoding';
  parameter: number;
}

function createDataMapper(
  target: object,
  property: string | symbol,
  mapper: (response: any) => any
): void {
  let dataMappers = (target as any).__dataMappers__;
  if (!dataMappers) {
    dataMappers = {};
    Object.defineProperty(target, '__dataMappers__', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: dataMappers
    });
  }
  dataMappers[property] = mapper;
}

function getDataMapper(
  target: object,
  property: string | symbol
): (response: any) => any {
  const dataMappers = (target as any).__dataMappers__;
  return dataMappers?.[property];
}

function createUrl(url: string, args: any[]): [string, number] {
  let i = 0;
  return [
    url
      .split('/')
      .map((part) =>
        (part.startsWith(':') || part.startsWith('{')) && i <= args.length
          ? args[i++]
          : part
      )
      .join('/'),
    args.length === 0 ? -1 : i
  ];
}

function createQuery(
  parameters: Record<string, string | number | boolean>
): string {
  return Object.keys(parameters)
    .reduce((query, name) => {
      return `${query}&${encodeURIComponent(name)}=${encodeURIComponent(
        parameters[name]
      )}`;
    }, '')
    .replace(/^&/, '?');
}

function filterFormData(args: any[], parameters?: FormParameter[]): any[] {
  return args.filter((_, index) => {
    return (
      !parameters || parameters.every((param) => param.parameter !== index)
    );
  });
}

function buildUrl(
  tmpl: string,
  args: any[],
  appendQuery: boolean
): [string, number] {
  const [url, queryOrBodyIndex] = createUrl(tmpl, args);
  const query = createQuery(
    appendQuery && queryOrBodyIndex > -1 ? args[queryOrBodyIndex] : {}
  );
  return [`${url}${query}`, queryOrBodyIndex];
}

function prepareHeaders(instance: Instance): Headers {
  const headers = new Headers();
  const { perRequest } = instance.__Pretend__;
  if (perRequest && perRequest.headers) {
    Object.keys(perRequest.headers).forEach((name) => {
      perRequest.headers![name].forEach((value) => {
        headers.append(name, value);
      });
    });
  }
  return headers;
}

function chainFactory(
  interceptors: Interceptor[],
  i = 0
): (request: IPretendRequest) => Promise<Response> {
  return function chainStep(request: IPretendRequest): Promise<Response> {
    return interceptors[i](chainFactory(interceptors, i + 1), request);
  };
}

function execute(
  instance: Instance,
  method: string,
  tmpl: string,
  args: any[],
  sendBody: boolean,
  appendQuery: boolean,
  parameters?: FormParameter[]
): Promise<any> {
  const createBody = () => {
    if (parameters) {
      if (parameters.some((parameter) => parameter.type === 'FormData')) {
        const formData = new FormData();
        parameters
          .filter(
            (parameter): parameter is FormDataParameter =>
              parameter.type === 'FormData'
          )
          .forEach((parameter: FormDataParameter) => {
            const value = args[parameter.parameter];
            if (value) {
              formData.append(parameter.name, value, value.name);
            }
          });
        return formData;
      }
      const body = args[appendQuery ? queryOrBodyIndex + 1 : queryOrBodyIndex];
      return createQuery(body).substr(1);
    }
    return sendBody
      ? JSON.stringify(
          args[appendQuery ? queryOrBodyIndex + 1 : queryOrBodyIndex]
        )
      : undefined;
  };
  const urlParams = filterFormData(args, parameters);
  const createUrlResult = buildUrl(tmpl, urlParams, appendQuery);
  const url = createUrlResult[0];
  const queryOrBodyIndex = createUrlResult[1];
  const headers = prepareHeaders(instance);
  const body = createBody();

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
export function methodDecoratorFactory(
  method: string,
  url: string,
  sendBody: boolean,
  appendQuery: boolean
): MethodDecorator {
  return (
    target: object,
    property: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) => {
    descriptor.value = function (this: Instance, ...args: any[]): Promise<any> {
      this.__Pretend__.dataMapper = getDataMapper(target, property);

      return execute(
        this,
        method,
        `${this.__Pretend__.baseUrl}${url}`,
        args,
        sendBody,
        appendQuery,
        (this.__Pretend__.parameters || {})[property.toString()]
      );
    };
    return descriptor;
  };
}

/**
 * @internal
 */
export function headerDecoratorFactory(
  headers: string | string[]
): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) => {
    const originalFunction: (...args: any[]) => Promise<any> = descriptor.value;
    descriptor.value = function (this: Instance, ...args: any[]): Promise<any> {
      return Promise.resolve().then(() => {
        this.__Pretend__.perRequest = {
          headers: (Array.isArray(headers) ? headers : [headers]).reduce(
            (akku, header) => {
              const match = header.match(/([^:]+):\s*(.*)/);
              if (!match) {
                throw new Error(`Invalid header format for '${header}'`);
              }
              const [, name, value] = match;
              if (!akku[name]) {
                akku[name] = [];
              }
              akku[name].push(value);
              return akku;
            },
            // tslint:disable-next-line: no-object-literal-type-assertion
            {} as Record<string, string[]>
          )
        };
        return originalFunction
          .apply(this, args)
          .then((result) => {
            this.__Pretend__.perRequest = undefined;
            return result;
          })
          .catch((error) => {
            this.__Pretend__.perRequest = undefined;
            throw error;
          });
      });
    };
    return descriptor;
  };
}

export function resourceTypeDecoratorFactory<
  T extends { new (...args: any[]): T },
  P = ConstructorParameters<T>
>(type: T, transform: (data: any) => P): MethodDecorator {
  return (target: object, property: string | symbol) => {
    createDataMapper(
      target,
      property,
      (data: any) => new type(...(transform(data) as any))
    );
  };
}

export class Pretend {
  private static readonly FetchInterceptor: Interceptor =
    // tslint:disable-next-line
    (_chain: Chain, request: IPretendRequest) =>
      fetch(request.url, request.options);
  public static readonly JsonDecoder: IPretendDecoder = (response: Response) =>
    response.json();
  public static readonly TextDecoder: IPretendDecoder = (response: Response) =>
    response.text();

  public static builder(): Pretend {
    return new Pretend();
  }

  private readonly interceptors: Interceptor[] = [];
  private decoder: IPretendDecoder = Pretend.JsonDecoder;

  public interceptor(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  public requestInterceptor(
    requestInterceptor: IPretendRequestInterceptor
  ): this {
    this.interceptors.push((chain: Chain, request: IPretendRequest) => {
      return chain(requestInterceptor(request));
    });
    return this;
  }

  public basicAuthentication(username: string, password: string): this {
    const usernameAndPassword = `${username}:${password}`;
    const auth =
      'Basic ' +
      (typeof (global as any).btoa !== 'undefined'
        ? (global as any).btoa(usernameAndPassword)
        : Buffer.from(usernameAndPassword, 'binary').toString('base64'));
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

  public target<T>(descriptor: { new (): T }, baseUrl: string): T {
    if (this.decoder) {
      // if we have a decoder, the first thing to do with a response is to decode it
      this.interceptors.push((chain: Chain, request: IPretendRequest) => {
        return chain(request).then((response) => this.decoder(response));
      });
    }
    // this is the end of the request chain
    this.interceptors.push(Pretend.FetchInterceptor);

    const instance = new descriptor() as T & Instance;
    Object.defineProperty(instance, '__Pretend__', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: {
        baseUrl: baseUrl.endsWith('/')
          ? baseUrl.substring(0, baseUrl.length - 1)
          : baseUrl,
        interceptors: this.interceptors,
        parameters: descriptor.prototype.__pretend_parameter__
      }
    });

    this.interceptors.unshift(async (chain, request) => {
      let response = await chain(request);
      if (instance.__Pretend__.dataMapper) {
        response = instance.__Pretend__.dataMapper(response);
        instance.__Pretend__.dataMapper = undefined;
      }
      return response;
    });

    return instance;
  }
}
