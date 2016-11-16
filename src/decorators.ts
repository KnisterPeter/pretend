import {methodDecoratorFactory, headerDecoratorFactory} from './index';

export function Get(url: string, appendQuery?: boolean): MethodDecorator {
  if (typeof appendQuery === 'undefined') {
    appendQuery = false;
  }
  return methodDecoratorFactory('GET', url, false, appendQuery);
}

export function Post(url: string): MethodDecorator {
  return methodDecoratorFactory('POST', url, true, false);
}

export function Put(url: string): MethodDecorator {
  return methodDecoratorFactory('PUT', url, true, false);
}

export function Delete(url: string): MethodDecorator {
  return methodDecoratorFactory('DELETE', url, false, false);
}

export function Headers(headers: string|string[]): MethodDecorator {
  return headerDecoratorFactory(headers);
}
