import {
  headerDecoratorFactory,
  methodDecoratorFactory,
  resourceTypeDecoratorFactory
} from './index';

export function Get(url: string, appendQuery?: boolean): MethodDecorator {
  if (typeof appendQuery === 'undefined') {
    appendQuery = false;
  }
  return methodDecoratorFactory('GET', url, false, appendQuery);
}

export function Post(url: string, appendQuery = false): MethodDecorator {
  return methodDecoratorFactory('POST', url, true, appendQuery);
}

export function Put(url: string, appendQuery = false): MethodDecorator {
  return methodDecoratorFactory('PUT', url, true, appendQuery);
}

export function Delete(
  url: string,
  sendBody = false,
  appendQuery = false
): MethodDecorator {
  return methodDecoratorFactory('DELETE', url, sendBody, appendQuery);
}

export function Patch(url: string): MethodDecorator {
  return methodDecoratorFactory('PATCH', url, true, false);
}

export function Headers(headers: string | string[]): MethodDecorator {
  return headerDecoratorFactory(headers);
}

export function FormData(name: string): ParameterDecorator {
  return (target: any, property: string | symbol, parameter: number) => {
    if (!target.__pretend_parameter__) {
      Object.defineProperty(target, '__pretend_parameter__', {
        enumerable: false,
        value: {}
      });
    }
    if (!target.__pretend_parameter__[property]) {
      target.__pretend_parameter__[property] = [];
    }
    target.__pretend_parameter__[property].push({
      type: 'FormData',
      name,
      parameter
    });
  };
}

export function FormEncoding(
  target: any,
  property: string | symbol,
  parameter: number
): void {
  if (!target.__pretend_parameter__) {
    Object.defineProperty(target, '__pretend_parameter__', {
      enumerable: false,
      value: {}
    });
  }
  if (!target.__pretend_parameter__[property]) {
    target.__pretend_parameter__[property] = [];
  }
  target.__pretend_parameter__[property].push({
    type: 'FormEncoding',
    parameter
  });
}

export function ResponseType<
  T extends { new (...args: any[]): any },
  P = ConstructorParameters<T>
>(
  type: T,
  transform: (data: any) => P = (data: any) => [data] as any
): MethodDecorator {
  return resourceTypeDecoratorFactory(type, transform);
}
