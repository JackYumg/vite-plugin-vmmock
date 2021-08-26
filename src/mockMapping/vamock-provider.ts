import path from 'path';
import { ResolvedConfig, normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { fileExists } from "../util/index";
import { VAMockOptionIn } from '../types';
import { createMockServer, requestMiddleware } from './createMockServer';

function getDefaultPath(supportTs = true) {
    return path.resolve(process.cwd(), `src/main.${supportTs ? 'ts' : 'js'}`);
}

export const createMockService = function (option: VAMockOptionIn): Plugin {

    let defaultPath = getDefaultPath();
    if (!fileExists(defaultPath)) {
        defaultPath = getDefaultPath(false);
        if (!fileExists(defaultPath)) {
            defaultPath = '';
        }
    }

    const defaultEnter = normalizePath(defaultPath);
    const { injectFile = defaultEnter } = option;
    let isDev = false;
    let config: ResolvedConfig;
    let needSourcemap = false;
    return {
        enforce: 'pre',
        name: 'vite-plugin-vamock',
        apply: 'serve',
        configResolved(resolvedConfig) {
            config = resolvedConfig;
            isDev = config.command === 'serve';
            needSourcemap = !!resolvedConfig.build.sourcemap;
            isDev && createMockServer(option);
        },

        configureServer: async ({ middlewares }) => {
            const { localEnabled = isDev } = option;
            if (!localEnabled) {
                return;
            }
            const middleware = await requestMiddleware(option);
            middlewares.use(middleware);
        },

        async transform(code: string, id: string) {
            if (isDev || !injectFile || !id.endsWith(injectFile)) {
                return null;
            }

            const { prodEnabled = true, injectCode = '' } = option;
            if (!prodEnabled) {
                return null;
            }
            return {
                map: needSourcemap ? this.getCombinedSourcemap() : null,
                code: `${code}\n${injectCode}`,
            };
        }
    }
}