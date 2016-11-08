declare module 'omni-fetch' {
  import {RequestOptions} from 'http';
  import 'isomorphic-fetch';
  export default function fetch(url: string, options?: RequestOptions | RequestInit): Promise<Response>;
}
