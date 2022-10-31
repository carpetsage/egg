// csv-stringify/lib/browser and csv-stringify/lib/browser/sync don't have type
// defs for some reason, unlike csv-stringify/lib and csv-stringify/lib/sync.

declare module 'csv-stringify/lib/browser/sync' {
  import { Input, Options } from 'csv-stringify';

  function stringify(input: Input, options?: Options): string;
  export = stringify;
}
