
import path from 'path';
import fs from 'fs-extra';

export default class Source {
    
    constructor( config ){
        this.config = config;
        this.dir = '';
    }

    // Gets source files and returns a path to the directory
    async fetch(){}

    // Clears downloaded files
    async clear(){
        if( !this.dir ) return;

        await fs.remove( this.dir );
    }
}