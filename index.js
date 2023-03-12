
const path         = require('path');
const fs           = require('fs-extra');
const http         = require('http');
const express      = require('express');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const subdomain    = require('express-subdomain');

const db = require('portfolio-db');
const logger = require('./lib/logger.js');
const ProjectManager = require( path.join( __dirname, './lib/project-manager.js' ) );

if( process.env.NODE_ENV != 'production' ){ require('dotenv').config(); }

// Clear workspace

fs.remove( path.join( __dirname, 'projects', 'temp' ) );

// DataBase init

const uri = process.env.MONGO_DB_URI;
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

db.connect( uri, options );

// App init

const app = express();
const server = http.createServer(app);

// Project Manager init

const manager = new ProjectManager();

// Load projects
db.models.Project.find({}).then( projects => {

    logger.info( `Found ${projects.length} project(s): ${projects.map( doc => `${doc.id} (${doc.details.name})` ).join(', ')}` );

    // Add projects to manager
    manager.addProjects( projects.map( project => {
        const config = {...project.hosting}
        config.id = project.id;

        return config;
    }));
});

// Keep projects up to date
db.models.Project.watch().on( 'change', change => {

    // TODO
});

// Middleware

app.use(bodyParser.json());
app.use(cookieParser());

// Logs

app.use(( req, res, next ) => {
    logger.log( 'request', `${req.protocol}://${req.get('host')}${req.url}` );
    next();
});
server.on( 'upgrade', ( req, socket, head ) => {
    logger.log( 'request', `${ socket.encrypted ? 'wss' : 'ws' }://${req.headers.host}${req.url}` );
});

// Routes

server.on( 'upgrade', manager.upgradeMiddleware() );
app.use(subdomain( `*`, manager.projectMiddleware() ));

// listen for requests
server.listen( process.env.PORT || 3000, () => {
    logger.info( `Listening at ${server.address().address}:${server.address().port}` );
});
