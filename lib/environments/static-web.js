
import Environment from './environment.js';

export default class EnvStaticWeb extends Environment {

    constructor( config, workdir ){
        super( ...arguments );
    }

    handleRequest( req, res, next ){
        res.sendFile( req.originalUrl, { root: this.dir } );
    }
}