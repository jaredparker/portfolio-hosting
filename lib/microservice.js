
import Queue from 'queue';

import Sources from './sources/index.js';
import Environments from './environments/index.js';

import { service_state } from './enums.js';

export default class Microservice {

    constructor({ id, match, dependencies, source, environment }) {

        this.id = id;
        this.match = match;
        this.dependencies = dependencies || [];   

        this.source = source;
        this.environment = environment;
        this.src = undefined;
        this.env = undefined;

        this.state = service_state.INACTIVE;

        // Inactivity management
        this.activeSockets = 0;
        this.shutdownTimeout = undefined;

        this.queue = new Queue({ concurrency: 1, autostart: true });
    }

    // # Middleware

    async handleUpgrade( req, socket, head ){
        if( !this.env ) throw new Error(`Microservice attempted to handle upgrade when environment not initialised: ${req.project.id}:${this.id}`);

        // Socket connected
        this.activeSockets++;
        this.clearInactivityTimeout();

        // Socket disconnected
        const onSocketClose = _ => {
            socket.removeListener( 'close', onSocketClose );

            this.activeSockets--;
            if( this.activeSockets <= 0 ) this.restartInactivityTimeout();
        }
        socket.on( 'close', onSocketClose );

        this.env.handleUpgrade( ...arguments );
    }

    // Pass request to environment
    async handleRequest( req, res, next ){
        if( !this.env ) throw new Error(`Microservice attempted to handle request when environment not initialised: ${req.project.id}:${this.id}`);

        this.restartInactivityTimeout();
        
        this.env.handleRequest( ...arguments );
    }

    // # Lifecycle

    // Job scheduling to avoid errors (e.g. startup while clearing data)
    _addJob( job ){
        return new Promise(( resolve, reject ) => {
            this.queue.push( async cb => {
                await job()
                    .then( resolve )
                    .catch( reject );
                cb();
            });
        });
    }

    launch(){
        return this._addJob( async _ => {
            // Skip if already active
            if( this.state != service_state.INACTIVE ) return;

            // Set state
            this.state = service_state.STARTUP;

            // Download source files
            this.src = Sources.create( this.source );
            await this.src.fetch();

            // Create & Start environment
            this.env = Environments.create( this.environment, this.src.dir );
            await this.env.start();

            // Set state
            this.state = service_state.ACTIVE;

            this.restartInactivityTimeout();
        });
    }

    shutdown(){
        return this._addJob( async _ => {
            // Skip if already inactive
            if( this.state != service_state.ACTIVE ) return;

            // Set state
            this.state = service_state.STOPPING;

            // Shutdown environment
            await this.env.shutdown();
            console.log('shutdown complete')

            // Clear source files
            //await this.src.clear();

            // Set state
            this.state = service_state.INACTIVE;
        });
    }

    // # Inactivity

    restartInactivityTimeout(){
        this.clearInactivityTimeout();

        this.shutdownTimeout = setTimeout( _ => {
            this.shutdown();
        }, 60_000 ); // 1 minute
    }

    clearInactivityTimeout(){
        if( this.shutdownTimeout ) clearTimeout( this.shutdownTimeout );
    }

}