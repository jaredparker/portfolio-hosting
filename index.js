
import path from 'path';
import fs from 'fs-extra';
import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import subdomain from 'express-subdomain';
import * as dotenv from 'dotenv';

import db from 'portfolio-db';
import logger from './lib/logger.js';
import ProjectManager from './lib/project-manager.js';
import { getDirname, subdomainUpgrade } from './lib/utils.js';
import { catchErrors, errorMiddleware } from './lib/errors.js';

const __dirname = getDirname( import.meta.url );

if( process.env.NODE_ENV != 'production' ){ dotenv.config(); }
const subdomainOffset = 2 + ( process.env.TOP_LEVEL_DOMAIN?.split('.')?.length-1 || 0 ) // Multi-level TLDs

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

app.use( bodyParser.json() );
app.use( cookieParser() );
app.set( 'subdomain offset', subdomainOffset )
server.on( 'upgrade', req => req.subdomains = req.headers.host.split('.').reverse().slice( subdomainOffset ) );

// Logs

app.use(( req, res, next ) => {
    logger.log( 'request', `${req.protocol}://${req.get('host')}${req.url}` );
    next();
});
server.on( 'upgrade', ( req, socket, head ) => {
    logger.log( 'request', `${ socket.encrypted ? 'wss' : 'ws' }://${req.headers.host}${req.url}` );
});

// Routes

const subdomainRoute = process.env.SUBDOMAIN ? `*.${process.env.SUBDOMAIN}` : '*';
const subdomainLevel = process.env.SUBDOMAIN ? process.env.split('.').length : 0;

server.on( 'upgrade', subdomainUpgrade( subdomainRoute, catchErrors( manager.upgradeMiddleware({ subdomainLevel }) ) ) );
app.use( subdomain( subdomainRoute, catchErrors( manager.projectMiddleware({ subdomainLevel }) ) ) );

// Error handling
app.use( errorMiddleware );

// listen for requests
server.listen( process.env.PORT || 3000, () => {
    logger.info( `Listening at ${server.address().address}:${server.address().port}` );
});
