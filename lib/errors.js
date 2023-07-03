
import logger from './logger.js';
import net from 'node:net';

// # Error Handling

export function catchErrors( middleware ){
    return async function( req, res, next ){

        // Handle Request
        try { await middleware( ...arguments );

        // Handle Error
        } catch(err){

            // Upgrade request
            if( res instanceof net.Socket ){
                errorMiddleware( err, req, res ); // res = socket
            }

            // Normal request
            else {
                next(err); // Pass to error middleware
            }
        }
    };
}

export async function errorMiddleware( err, req, res, next ){
    logger.error( err.stack );
    
    // Socket connection
    if( res instanceof net.Socket ){
        res.on('error', _ => {}); // Ignore unhandled error event
        return res.destroy(err);
    }

    // Respond with relevant error page
    switch( true ){
        case err instanceof ConfigError:
            res.status(500).send( 'Uh oh! Something about this project has been setup incorrectly.' );
            break;
        default:
            res.status(500).send( 'Uh oh! Something unexpected happened.' );
    }
}

// # Error Types

export class ConfigError extends Error {
    constructor(message = "", ...args) {
      super(message, ...args);
      this.name = "ConfigError";
    }
}