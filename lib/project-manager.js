
import logger from './logger.js';
import Project from './project.js';

export default class ProjectManager {

    constructor({ haltWhileLoading=true }={}){

        // Projects
        this.projects = {};

        // Loading projects
        this.haltWhileLoading = haltWhileLoading;
        this._loaded = false;
        this._loadedPromises = [];
    }

    // # Load Project Data

    addProjects( projects, updateLoaded=true ){
        for( const config of projects ) this.addProject( config );
        if( updateLoaded ) this.setLoaded( true );
    }

    addProject( config ){
        const project = new Project( config );
        this.projects[ project.id ] = project;
    }

    // # Middleware

    // Pass socket connections to project
    upgradeMiddleware({ subdomainLevel=0 }={}){
        const self = this;

        return async function( req, socket, head  ){

            // Add req.servicePath
            self.#addServicePath( req, subdomainLevel );

            // Match project
            req.project = await self.#matchProject( req.servicePath );
            if( req.project == -1 ) return socket.destroy();

            await req.project.handleUpgrade( ...arguments );
        }
    }

    // Pass request to project
    projectMiddleware({ subdomainLevel=0 }={}){
        const self = this;

        return async function( req, res, next ){

            // Add req.servicePath
            self.#addServicePath( req, subdomainLevel );

            // Match project
            req.project = await self.#matchProject( req.servicePath );
            if( req.project == -1 ) return res.send( `Sorry, but '${req.servicePath[0]}' doesn't exists` );

            // Handle request
            await req.project.handleRequest( ...arguments );
        }
    }

    // # Utils

    // Offset subdomains for domain prefixing (e.g. for project.my-projects.example.com) 
    #addServicePath( req, subdomainLevel=0 ){
        req.servicePath = req.subdomains.slice( subdomainLevel );
    }

    async #matchProject( servicePath ){

        // Wait till all project data loaded
        await this.waitLoad();

        // Get project
        if( servicePath?.length <= 0 ) return;
        const projectID = servicePath[0];
        const project = this.projects[ projectID ];

        // Check project exists
        if( !project ){
            logger.debug( `Requested Project not found (${projectID})` );
            return -1;
        }

        return project;
    }

    async waitLoad(){
        if( !this.haltWhileLoading ) return true;
        if( this._loaded ) return true;
        
        // Await this._loaded to change to true
        return await new Promise(( resolve, reject ) => {
            this._loadedPromises.push( resolve );
        });
    }
    
    setLoaded( val=true ){
        this._loaded = val;

        if( this.haltWhileLoading ){
            logger.info(
                val
                ? 'Project Data Loaded: Project manager ready to handle requests'
                : 'Project Data set as not loaded: Project manager has paused handling requests'
            );
        }

        // Resolve promises awaiting load finish
        if( val === true ){

            const promises = this._loadedPromises;
            this._loadedPromises = [];

            promises.map( resolve => resolve() );

        }
    }
}