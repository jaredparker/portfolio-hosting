
import EventEmitter from 'events';
import getPort, { portNumbers } from 'get-port';
import waitPort from 'wait-port';
import { createProxyMiddleware } from 'http-proxy-middleware';

import logger from '../logger.js';
import { errorMiddleware } from '../errors.js';

export default class Environment extends EventEmitter {

    constructor( config, workdir ){
        super();
        this.config = config;
        this.dir = workdir;
    }

    start(){}
    shutdown(){}

    handleUpgrade(){}
    handleRequest(){}

    // # Helper Functions

    async findOpenPort(){
        const port = await getPort({ port: portNumbers(3000, 3999) });
        return port;
    }

    // wait for port to be actively used
    async waitPort(){
        return await waitPort({ port: this.port, output: 'silent' });
    }

    createProxy( port ){
        if( !port ) throw new Error(`Environment (${this.config.kind}) attempted to create proxy without port: ${this.dir}`);

        const proxy = createProxyMiddleware(
            `/`,
            {
                target: `http://localhost:${port}`,
                changeOrigin: true,
                ws: false,
                logProvider: _ => logger,
                onError: errorMiddleware
            }
        );
        return proxy;
    }

}