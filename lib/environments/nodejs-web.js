
import Environment from './environment.js';

import TrmExec from './terminals/exec.js';

const Terminal = TrmExec;

export default class EnvNodeJSWeb extends Environment {

    constructor( config, workdir ){
        super( ...arguments );
    }

    handleUpgrade( req, socket, head ){
        this.proxy.upgrade( ...arguments );
    }

    handleRequest( req, res, next ){
        this.proxy( ...arguments );
    }

    async start(){

        // Setup
        this.port  = await this.findOpenPort();
        this.proxy = this.createProxy( this.port );

        // Install
        this.terminal = new Terminal( this.dir, { PORT: this.port } );
        await this.terminal.run( 'npm i' );

        // Start
        this.terminal.run( this.config.start || 'npm start' );

        await this.waitPort( this.port );
    }

    async shutdown(){

        // Stop container
        await this.terminal.kill();
    }

}