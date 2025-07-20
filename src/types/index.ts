/**
 * A regex "match" in a line of text represented by starting and ending index.
 */
export interface Match {
    start: number;
    end: number;
}

/**
 * A "close enough" approximation of JSON/a javascript object.
 */
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type JsonObjectOrArray = { [key: string]: Json } | Json[];

/**
 * Options used for detecting "words" when no explicit highlighting is used
 */
export type CursorWordOptions =
    | {
          /**
           * Characters beyond alphanumerics and underscore that should be used to detect "words"
           */
          extraWordChars?: string[];
          /**
           * If true, provided regex will be wrapped in ^ and $
           */
          matchFullLine?: boolean;
      }
    | {
          /**
           * If true, words will be parsed along whitespace as delimiter
           */
          useWhitespaceDelimiter: true;
      };
