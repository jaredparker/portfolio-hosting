
import path from 'path';
import fs from 'fs-extra';

import Source from './source.js';
import { getDirname } from '../utils.js';

const __dirname = getDirname( import.meta.url );

export default class SrcSafeLocal extends Source {

    constructor( config ){
        super( config ); // Setup vars
    }

    async fetch(){
        const source      = path.join( __dirname, '../../projects/local/', this.config.src );
        const destination = path.join( __dirname, '../../projects/temp/', this.config.src );

        await fs.copy( source, destination );
        this.dir = destination;

        return destination;
    }
}