
declare module 'multilang-extract-comments' {
    import { CommentType } from 'models/comment';
    type ExtractedComment = {
        begin: number // selection line number where comment starts
        end: number // selection line number where comment ends (i.e., the last line)
        content: string // the extracted comment text, including newlines but excluding line prefixes (e.g., '//')
        info: {
            type: CommentType
            apidoc: boolean // true if this is an apidoc block comment
        }
        codeStart: number // selection line number where code starts
        code: string // the extracted code text of the codeStart line
    }
    type CommentMap = Record<ExtractedComment['begin'], ExtractedComment>;
    function extract(text: string, options?: any): CommentMap;
    export = extract;
}