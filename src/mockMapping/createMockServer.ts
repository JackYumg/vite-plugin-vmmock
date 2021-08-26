import type { VAMockOptionIn, MockMethod, NodeModuleWithCompile } from './../types';

import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import chalk from 'chalk';
import url from 'url';
import fg from 'fast-glob';
import module from 'module';
import Vmmock from 'vmmock';
import { build } from 'esbuild';
import { pathToRegexp, match } from 'path-to-regexp';
import { isArray, isFunction, sleep, isRegExp } from '../util';
import { NextHandleFunction } from 'connect';
export let mockData: any[] = [];
const vmmock: any = new Vmmock();
export async function createMockServer(
    opt: VAMockOptionIn = { mockPath: 'mock', configPath: 'vite.mock.config', basePath: '/' }
) {
    opt = {
        mockPath: 'mock',
        watchFiles: true,
        supportTs: true,
        configPath: 'vite.mock.config.ts',
        logger: true,
        ...opt,
    };

    if (mockData.length > 0) return;
    mockData = await getMockConfig(opt);
    vmmock.setMockData(mockData);
    await createWatch(opt);
}

// request match
export async function requestMiddleware(opt: VAMockOptionIn) {
    const { logger = true } = opt;
    const middleware: NextHandleFunction = async (req: any, res: any, next: any) => {
        let queryParams: {
            query?: {
                [key: string]: any;
            };
            pathname?: string | null;
        } = {};

        if (req.url) {
            queryParams = url.parse(req.url, true);
        }
        let reqUrl: string = queryParams.pathname || '';
        const rxp = new RegExp(`^${opt.basePath || '/'}`);
        const isMatched = rxp.test(reqUrl);
        if (rxp && !isMatched) {
            next();
            return;
        }
        reqUrl = reqUrl.replace(opt.basePath, '');
        const matchRequest = mockData.find((item: any) => {
            if (!reqUrl || !item || !item.url) {
                return false;
            }
            if (item.method && item.method.toUpperCase() !== req.method) {
                return false;
            }
            const e = pathToRegexp(item.url.replace(opt.basePath, ''));
            const matched = e.test(reqUrl);
            console.log(reqUrl , item.url , opt.basePath , e , matched);
            return matched;
        });
        if (matchRequest) {
            const isGet = req.method && req.method.toUpperCase() === 'GET';
            const { rawResponse, timeout, statusCode, url } = matchRequest;

            if (timeout) {
                await sleep(timeout);
            }

            const urlMatch = match(url, { decode: decodeURIComponent });

            let query = queryParams.query;
            if (reqUrl) {
                if ((isGet && JSON.stringify(query) === '{}') || !isGet) {
                    const params = (urlMatch(reqUrl) as any).params;
                    if (JSON.stringify(params) !== '{}') {
                        query = (urlMatch(reqUrl) as any).params || {};
                    } else {
                        query = queryParams.query || {};
                    }
                }
            }

            if (isFunction(rawResponse)) {
                await rawResponse(req, res);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = statusCode || 200;
                const e = vmmock.parser.parseTemplateOption(matchRequest.type, matchRequest.option);
                res.end(JSON.stringify({
                    code: '20000',
                    message: '成功',
                    data: e
                }));
            }
            logger && loggerOutput('request invoke', req.url!);
            return;
        }
        next();
    };
    return middleware;
}

// create watch mock
function createWatch(opt: VAMockOptionIn) {
    const { configPath, logger, watchFiles } = opt;

    if (!watchFiles) {
        return;
    }

    const { absConfigPath, absMockPath } = getPath(opt);

    if (process.env.VITE_DISABLED_WATCH_MOCK === 'true') {
        return;
    }

    const watchDir = [];
    const exitsConfigPath = fs.existsSync(absConfigPath);

    exitsConfigPath && configPath ? watchDir.push(absConfigPath) : watchDir.push(absMockPath);
    const watcher = chokidar.watch(watchDir, {
        ignoreInitial: true,
    });

    watcher.on('all', async (event: any, file: any) => {
        logger && loggerOutput(`mock file ${event}`, file);
        mockData = await getMockConfig(opt);
    });
}

// clear cache
function cleanRequireCache(opt: VAMockOptionIn) {
    if (!require || !require.cache) {
        return;
    }
    const { absConfigPath, absMockPath } = getPath(opt);
    Object.keys(require.cache).forEach((file) => {
        if (file === absConfigPath || file.indexOf(absMockPath) > -1) {
            delete require.cache[file];
        }
    });
}

// load mock .ts files and watch
async function getMockConfig(opt: VAMockOptionIn) {
    cleanRequireCache(opt);
    const { absConfigPath, absMockPath } = getPath(opt);
    const { ignore, configPath, logger } = opt;

    let ret: MockMethod[] = [];
    if (configPath && fs.existsSync(absConfigPath)) {
        logger && loggerOutput(`load mock data from`, absConfigPath);
        ret = await resolveModule(absConfigPath);
        return ret;
    }

    const mockFiles = fg
        .sync(`**/*.{ts,js}`, {
            cwd: absMockPath,
        })
        .filter((item: any) => {
            if (!ignore) {
                return true;
            }
            if (isFunction(ignore)) {
                return ignore(item);
            }
            if (isRegExp(ignore)) {
                return !ignore.test(path.basename(item));
            }
            return true;
        });
    try {
        ret = [];
        const resolveModulePromiseList = [];

        for (let index = 0; index < mockFiles.length; index++) {
            const mockFile = mockFiles[index];
            resolveModulePromiseList.push(resolveModule(path.join(absMockPath, mockFile)));
        }

        const loadAllResult = await Promise.all(resolveModulePromiseList);
        for (const resultModule of loadAllResult) {
            let mod = resultModule;
            if (!isArray(mod)) {
                mod = [mod];
            }
            ret = [...ret, ...mod];
        }
    } catch (error) {
        loggerOutput(`mock reload error`, error);
        ret = [];
    }
    return ret;
}

// Inspired by vite
// support mock .ts files
async function resolveModule(p: string): Promise<any> {
    const result = await build({
        entryPoints: [p],
        outfile: 'out.js',
        write: false,
        platform: 'node',
        bundle: true,
        format: 'cjs',
        metafile: true,
        target: 'es2015',
    });
    const { text } = result.outputFiles[0];

    return await loadConfigFromBundledFile(p, text);
}

// get custom config file path and mock dir path
function getPath(opt: VAMockOptionIn) {
    const { mockPath, configPath } = opt;
    const cwd = process.cwd();
    const absMockPath = path.join(cwd, mockPath || '');
    const absConfigPath = path.join(cwd, mockPath || '', configPath || '');
    return {
        absMockPath,
        absConfigPath,
    };
}

function loggerOutput(title: string, msg: string, type: 'info' | 'error' = 'info') {
    const tag =
        type === 'info' ? chalk.cyan.bold(`[vite:mock]`) : chalk.red.bold(`[vite:mock-server]`);
    return console.log(
        `${chalk.dim(new Date().toLocaleTimeString())} ${tag} ${chalk.green(title)} ${chalk.dim(msg)}`
    );
}

// Parse file content
export async function loadConfigFromBundledFile(fileName: string, bundledCode: string) {
    const extension = path.extname(fileName);
    const extensions = (module.Module as any)._extensions;
    let defaultLoader: any;
    const isJs = extension === '.js';
    if (isJs) {
        defaultLoader = extensions[extension]!;
    }

    extensions[extension] = (module: NodeModule, filename: string) => {
        if (filename === fileName) {
            (module as NodeModuleWithCompile)._compile(bundledCode, filename);
        } else {
            if (!isJs) {
                extensions[extension]!(module, filename);
            } else {
                defaultLoader(module, filename);
            }
        }
    };
    let config;
    try {
        if (isJs && require && require.cache) {
            delete require.cache[fileName];
        }
        const raw = require(fileName);
        config = raw.__esModule ? raw.default : raw;
        if (defaultLoader && isJs) {
            extensions[extension] = defaultLoader;
        }
    } catch (error) {
        console.error(error);
    }

    return config;
}