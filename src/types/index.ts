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
