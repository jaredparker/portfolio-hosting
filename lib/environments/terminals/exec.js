
import { exec } from 'child_process';
import kill from 'tree-kill';

import Terminal from './terminal.js';

export default class TrmExec extends Terminal {

    constructor( workdir, env ){
        super( ...arguments );

        this.options = {
            cwd: this.workdir,
            env: this.env,
        }
    }

    async run( cmd ){
        await new Promise( ( resolve, reject ) => {
            this.process = exec( cmd, this.options, ( err, stdout, stderr ) => {

                console.log(err);
                console.log(stdout);
                console.log(stderr);

                resolve();
            });
        });
    }

    async kill(){
        console.log('Killing process', this.process.pid);
        if( !this.process ) return;

        await new Promise( ( resolve, reject ) => {
            kill( this.process.pid, 'SIGTERM', err => {
                if( err ) reject( err );
                else resolve();
            });
        });
    }
}