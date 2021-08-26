import { IncomingMessage, ServerResponse } from "http";

export interface VAMockOptionIn {
    basePath: string;
    mockPath?: string;
    configPath?: string;
    ignore?: RegExp | ((fileName: string) => boolean);
    watchFiles?: boolean;
    localEnabled?: boolean;
    prodEnabled?: boolean;
    injectFile?: string;
    injectCode?: string;
    supportTs?: boolean;
    logger?: boolean;
}

export type MockMethedType = 'get' | 'post' | 'put' | 'delete' | 'patch';

export type Recordable<T = any> = Record<string, T>;

export declare interface MockMethod {
    url: string;
    method?: MockMethedType;
    timeout?: number;
    statusCode?: number;
    response?:
    | ((opt: { url: Recordable; body: Recordable; query: Recordable; headers: Recordable }) => any)
    | any;
    rawResponse?: (req: IncomingMessage, res: ServerResponse) => void;
    dataMapping: string | Object;
}

export interface NodeModuleWithCompile extends NodeModule {
    _compile(code: string, filename: string): any;
}