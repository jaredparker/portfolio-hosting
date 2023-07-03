
import path from 'path';
import { fileURLToPath } from 'url';
import subdomain from 'express-subdomain';

export function getDirname( metaURL ){
    return path.dirname( fileURLToPath( metaURL ) );
}

export function subdomainUpgrade( _subdomain, middleware ){
    return function( req, socket, head ){

        // Simulate request
        return subdomain( _subdomain, ( req, res, next ) =>{
            return middleware( req, socket, head );
        })( req, '', () => {} );
    }
}