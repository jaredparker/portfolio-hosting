
const logger = require('./logger.js');

const Microservice = require('./microservice.js');

class Project {

    constructor({ id, services }){

        this.id = id;
        this.services = {};
        this.serviceRegexps = [];

        for( const config of services ) this.addMicroservice( config );
    }

    addMicroservice( config ){
        const microservice = new Microservice( config );
        const regexp = new RegExp( // Create regexp from id
            `^${
                microservice.id
                .replace( '.', '\\.' ) // Escape dots
                .replace( '*', '.+' ) // Allow for wildcard
            }$`, 'i'
        );

        this.insertServiceRegex( microservice.id, regexp ); // Regexp is used to match subdomains, ordered by priority
        this.services[ microservice.id ] = microservice;
    }

    // Insert service regexp into sorted array (instead of sorting each time)
    insertServiceRegex( id, regexp ){

        // Compare ids ( e.g * or api or api.app )
        const compare = ( a, b ) => {

            const _a = a.split('.');
            const _b = b.split('.');
            
            // Prioritise longest match
            const lengthSort = _b.length - _a.length;
            if( lengthSort != 0 ) return lengthSort;

            // Prioritise exact match
            for( let i = _a.length-1; i >= 0; i-- ){

                // Continue until difference in wildcard found (highest domain level to lowest)
                const _aiWild = _a[i] == '*';
                const _biWild = _b[i] == '*';
                if( _aiWild === _biWild ) continue;

                // Difference found, break
                return _aiWild ? 1 : -1;
            }

            // No difference
            return 0;
        }

        let low = 0;
        let high = this.serviceRegexps.length;

        while( low < high ){
            const mid = ( low + high ) >>> 1; // Divide by 2 and round down
            if( compare( this.serviceRegexps[mid][0], id ) < 0 ) low = mid + 1;
            else high = mid;
        }

        // Insert
        this.serviceRegexps.splice( low, 0, [ id, regexp ] );
    }

    // Find service by regexp
    matchService( str ){
        const matchedServices = this.serviceRegexps.filter( ([ id, regex ]) => {
            return regex.test( str );
        });
        const service = matchedServices.length > 0 ? this.services[matchedServices[0][0]] : -1

        logger.debug( `Matched '${str}' with ${service.id||-1} from ${this.serviceRegexps.map( ([ id, regex ]) => `${id}:(${regex})` ).join(' ')}` );

        return service;
    }

    // Middleware

    handleRequest( req, res, next ){
        
        // Get service
        const serviceID = req.subdomains.slice( 1, req.subdomains.length ).reverse().join('.') || '@';
        
        const service = this.matchService( serviceID );

        // Check if service exists
        if( service == -1 ){
            logger.debug( `Requested project found (${this.id}), but service not found (${serviceID}): Sending error page` );
            res.send( `Service '${serviceID}' not found` );
            return;
        }
        
        // Handle request
        logger.debug( `Requested project & service found (${this.id}:${service.id}): Handling request` );
        service.handleRequest( req, res, next );
    }

}

module.exports = Project;