
import logger from './logger.js';
import Microservice from './microservice.js';

import { service_state } from './enums.js';

export default class Project {

    constructor({ id, services }){

        this.id = id;
        this.services = {};
        this.serviceRegexps = [];

        this._dependentsPreload = {}; // Calculate dependents before services are added

        for( const config of services ) this.addMicroservice( config );
    }

    // # Load Microservice Data

    addMicroservice( config ){
        const microservice = new Microservice( config );
        microservice.projectID = this.id;

        // Service uses web requests, add regexp to match requests to service
        if( microservice.match ){

            // Create regexp from match
            const regexp = new RegExp(
                `^${
                    microservice.match
                    .replace( '.', '\\.' ) // Escape dots
                    .replace( '*', '.+' ) // Allow for wildcard
                }$`, 'i'
            );
            this.insertServiceRegex( microservice.id, regexp ); // Regexp is used to match subdomains, ordered by priority
        }

        // Add any dependents that were waiting for this service to be added
        if( this._dependentsPreload[ microservice.id ] ){
            microservice.dependents.push( ...this._dependentsPreload[ microservice.id ] );
        }

        // Add dependencies as dependents to the respective service
        for( const dependencyID of microservice.dependencies ){
            const dependency = this.services[ dependencyID ];
            
            // Dependency not found or has not been added yet, add to preload
            if( !dependency ){
                if( !this._dependentsPreload[ dependencyID ] ) this._dependentsPreload[ dependencyID ] = [];
                this._dependentsPreload[ dependencyID ].push( microservice.id );
                continue;
            }

            dependency.dependents.push( microservice.id );
        }


        this.services[ microservice.id ] = microservice;
    }

    // Insert service regexp into sorted array (instead of sorting each time)
    insertServiceRegex( id, regexp ){

        // Compare matches ( e.g * or api or api.app )
        const compare = ( a, b ) => {

            const _a = a.split('.');
            const _b = b.split('.');
            
            // Prioritise longest match
            const lengthSort = _b.length - _a.length;
            if( lengthSort != 0 ) return lengthSort;

            // Prioritise exact match (over wildcard)
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

        // Binary search
        while( low < high ){
            const mid = ( low + high ) >>> 1; // Divide by 2 and round down
            if( compare( this.serviceRegexps[mid][0], id ) < 0 ) low = mid + 1;
            else high = mid;
        }

        // Insert
        this.serviceRegexps.splice( low, 0, [ id, regexp ] );
    }

    // # Middleware

    async handleUpgrade( req, socket, head ){

        // Get service
        const serviceQuery = this.#formatServicePath( req.servicePath );
        const service = this.#matchService( serviceQuery );

        // Check if service exists
        if( service == -1 ){
            logger.debug( `Requested project found (${this.id}), but service not found (${serviceQuery}): Sending error page` );
            //res.send( `Service '${serviceQuery}' not found` );
            return;
        }

        // TODO: Respond with loading view
        // Launch service and its dependencies
        await this.launchService( service );

        // Handle request
        logger.debug( `Requested project & service found (${this.id}:${service.id}): Upgrading websocket` );
        await service.handleUpgrade( ...arguments );
    }

    // Launch microservice and/or pass request to service
    async handleRequest( req, res, next ){
        
        // Get service
        const serviceQuery = this.#formatServicePath( req.servicePath );
        const service = this.#matchService( serviceQuery );

        // Check if service exists
        if( service == -1 ){
            logger.debug( `Requested project found (${this.id}), but service not found (${serviceQuery}): Sending error page` );
            res.send( `Service '${serviceQuery}' not found` );
            return;
        }

        // TODO: Respond with loading view
        // Launch service and its dependencies
        await this.launchService( service );

        // Handle request
        logger.debug( `Requested project & service found (${this.id}:${service.id}): Handling request` );
        await service.handleRequest( ...arguments );
    }

    // # Utils

    // Remove project ID from services path and format for queries
    #formatServicePath( servicePath ){
        return servicePath.slice( 1, servicePath.length ).reverse().join('.') || '@';
    }

    // Find service by regexp
    #matchService( serviceQuery ){
        const matchedServices = this.serviceRegexps.filter( ([ id, regex ]) => {
            return regex.test( serviceQuery );
        });
        const service = matchedServices.length > 0 ? this.services[matchedServices[0][0]] : -1;

        logger.debug( `Matched '${serviceQuery}' with ${service.id||-1} from ${this.serviceRegexps.map( ([ id, regex ]) => `${id}:(${regex})` ).join(' ')}` );

        return service;
    }

    // Launch service and its dependencies
    async launchService( service ){

        // ~ does nothing if no dependencies
        const launchPromises = service.dependencies.map( id => this.launchService( this.services[id] ) );
        await Promise.all( launchPromises );

        service.removeAllListeners( 'inactivity' );
        service.on( 'inactivity', () => this.shutdownService( service ) );

        await service.launch();
    }

    // Shutdown service if dependents are not running
    async shutdownService( service ){

        // Check if any dependents are running
        const activeDependent = service.dependents.find( id => this.services[id].state == service_state.STARTUP || this.services[id].state == service_state.ACTIVE );
        if( activeDependent ) return;

        // Check if service has activity (active usage from users)
        if( !service.inactivity ) return;
        
        await service.shutdown();

        // Shutdown dependencies if they are experiencing inactivity
        const shutdownPromises = service.dependencies.map( id => this.shutdownService( this.services[id] ) );
        await Promise.all( shutdownPromises );
    }

}