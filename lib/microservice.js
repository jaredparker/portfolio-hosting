
class Microservice {

    constructor({ id, match }) {

        this.id = id;
        this.match = match;
        
    }

    // Pass request to environment
    handleRequest( req, res, next ){

        res.send( `Hello world at: ${this.id}` );
    }

}

module.exports = Microservice;