
interface LoggerOption {
    showLogger?: boolean;
    api?: string;
}

let baseOption: LoggerOption = {};

// 请求拦截
function requestCall(req: Request) {
    const methodType = ''.toLocaleUpperCase.call(req.method);
    const url = req.url;
    const api = baseOption.api || '';
    const apiRep = new RegExp(`^${api}`);
    if (apiRep.test(url)) {
        console.log(`%c[👽->${methodType}->Request]:${req.url}`, "background:rgba(133,108,217,1);color:#fff", { Request: req });
    }
    return req;
}

// 响应拦截器
function responseCall(rep: any) {
    const { url, method } = rep.config;
    const methodType = ''.toLocaleUpperCase.call(method);
    const api = baseOption.api || '';
    const apiRep = new RegExp(`^${api}`);
    console.log(`%c[👽->${methodType}->Response]:${url}`, "background:rgba(133,108,217,1);color:#fff", { Response: rep });
    if (apiRep.test(url)) {
        return rep.data;
    }
    return rep;
}

function errorCall(error: Error) {
    return Promise.reject(error);
}

function createAxiosLogger(option: LoggerOption) {
    baseOption = {
        showLogger: true,
        api: '/apis',
        ...option,
    };
    return {
        axios: {},
        install: function (app: any, opt: any) {
            this.axios = opt;
            this.init();
        },
        init: async function () {
            const e = this.axios;
            if (e && option.showLogger) {
                (e as any).interceptors.request.use(requestCall, errorCall);
                (e as any).interceptors.response.use(responseCall, errorCall)
            } else if (!e) {
                console.log('未找到axios');
            }
        }
    }
}
export const createMockLogger = function () {
    return {
        axiosLogger: {
            createAxiosLogger
        }
    }
}