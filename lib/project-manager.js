
const logger = require('./logger.js');
const Project = require('./project.js');

class ProjectManager {

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
        for( const config of projects ) this.addProject(config);
        if( finishedLoading ) this.setLoaded( true );
    }

    addProject( projectConfig ){
        const project = new Project( projectConfig );
        this.projects[ project.id ] = project;
    }

    // # Middleware

    // Handle socket connections
    upgradeMiddleware(){
        const self = this;

        return async function( req, socket, head  ){

            // Wait till all project data loaded
            await self.waitLoad();
        }
    }

    // Handle requests
    projectMiddleware(){
        const self = this;

        return async function( req, res, next ){

            // Wait till all project data loaded
            await self.waitLoad();

            res.send('Hello World!');
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

module.exports = ProjectManager;