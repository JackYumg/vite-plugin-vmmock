namespace AMock {
    // 状态码
    export type STATUS_CODE_TYPE = 20000 | 10001 | 40000;
    export type RESPONSE_TYPE = Values<responseType>;
    export interface TableOption {
        showTotal: boolean;
        pageNo: number;
        pageSize: number;
    }

    export interface TypeObj {
        [key: string]: string
    }

    export type DataMapping = string | TypeObj;

    export type responseType = {
        code: STATUS_CODE_TYPE,
        data: any,
        message: string;
    }

    export type Values<T> = {
        [key in keyof T]: T[key]
    }

}

