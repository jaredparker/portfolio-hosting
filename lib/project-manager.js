

class ProjectManager {

    constructor( haltWhileLoading=true ){

        this.haltWhileLoading = haltWhileLoading;
        this._loaded = false;
        this._loadedPromises = [];
    }

    // # Load Project Data

    addProjects( projects, finishedLoading=true ){
        projects.map( this.addProject );
        if( finishedLoading ) this.setLoaded( true );
    }

    addProject( projectConfig ){

    }

    // # Middleware

    // Handle socket connections
    upgradeMiddleware(){
        const self = this;

        return async function( req, socket, head  ){
            console.log(`socket -> ${req.url}`);

            // Wait till all project data loaded
            await self.waitLoad();
        }
    }

    // Handle requests
    projectMiddleware(){
        const self = this;

        return async function( req, res, next ){
            console.log(`req -> ${req.url}`);

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
        return new Promise(( resolve, reject ) => {
            this._loadedPromises.push( resolve );
        });
    }
    
    setLoaded( val=true ){
        this._loaded = val;

        // Resolve promises awaiting load finish
        if( val === true ){

            const promises = this._loadedPromises;
            this._loadedPromises = [];

            promises.map( resolve => resolve() );
        }
    }
}

module.exports = ProjectManager;