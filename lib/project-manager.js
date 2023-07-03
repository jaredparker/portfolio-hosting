
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

            // Wait till all project data loaded
            await self.waitLoad();

            // Offset serving subdomain (e.g. for projecta.projects.example.com)
            req.serviceRoute = req.subdomains.slice( subdomainLevel );

            // Get project
            if( req.serviceRoute?.length <= 0 ) return;
            const projectID = req.serviceRoute[0];
            const project = self.projects[ projectID ];

            // Check project exists
            if( !project ){
                logger.debug( `Requested Project not found (${projectID}): Sending error page` );
                return; //res.send( `Sorry, but '${projectID}' doesn't exists` );
            }

            logger.debug( `Requested project: ${projectID}` );

            req.project = project;

            await project.handleUpgrade( ...arguments );
        }
    }

    // Pass request to project
    projectMiddleware({ subdomainLevel=0 }={}){
        const self = this;

        return async function( req, res, next ){

            // Wait till all project data loaded
            await self.waitLoad();

            // Offset serving subdomain (e.g. for projecta.projects.example.com)
            req.serviceRoute = req.subdomains.slice( subdomainLevel );

            // Get project
            if( req.serviceRoute?.length <= 0 ) return;
            const projectID = req.serviceRoute[0];
            const project = self.projects[ projectID ];

            // Check project exists
            if( !project ){
                logger.debug( `Requested Project not found (${projectID}): Sending error page` );
                return res.send( `Sorry, but '${projectID}' doesn't exists` );
            }

            req.project = project;

            // Handle request
            await project.handleRequest( ...arguments );
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