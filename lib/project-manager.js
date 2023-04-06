
import logger from './logger.js';
import Project from './project.js';

export default class ProjectManager {

    constructor( haltWhileLoading=true ){

        // Projects
        this.projects = {};

        // Loading projects
        this.haltWhileLoading = haltWhileLoading;
        this._loaded = false;
        this._loadedPromises = [];
    }

    // # Load Project Data

    addProjects( projects, finishedLoading=true ){
        for( const config of projects ) this.addProject( config );
        if( finishedLoading ) this.setLoaded( true );
    }

    addProject( config ){
        const project = new Project( config );
        this.projects[ project.id ] = project;
    }

    // # Middleware

    // Handle socket connections
    upgradeMiddleware(){
        const self = this;

        return async function( req, socket, head  ){

            // Wait till all project data loaded
            await self.waitLoad();

            // Add subdomains to request
            req.subdomains = req.headers.host.split('.').reverse().slice(2);

            // Get project
            const projectID = req.subdomains[0];

            logger.debug( `Requested project: ${projectID}` );
        }
    }

    // Handle requests
    projectMiddleware(){
        const self = this;

        return async function( req, res, next ){

            // Wait till all project data loaded
            await self.waitLoad();

            // Get project
            if( req.subdomains?.length <= 0 ) return;
            const projectID = req.subdomains[0];
            const project = self.projects[ projectID ];

            // Check project exists
            if( !project ){
                logger.debug( `Requested Project not found (${projectID}): Sending error page` );
                return res.send( `Sorry, but '${projectID}' doesn't exists` );
            }

            // Handle request
            project.handleRequest( req, res, next );
        }
    }

    // # Main

    launchProject(){

    }

    // # Utils

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