
import path from 'path';

import Source from './source.js';
import { getDirname } from '../utils.js';

const __dirname = getDirname( import.meta.url );

export default class SrcLocal extends Source {

    constructor( config ){
        super( config ); // Setup vars
    }

    async fetch(){
        this.dir = path.join( __dirname, '../../projects/local/', this.config.src );
        return this.dir;
    }

    // Reset Clear function (not needed for local source)
    async clear(){}
}