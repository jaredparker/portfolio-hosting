
class Microservice {

    constructor({ name }) {

        this.id = name;
        
    }

    handleRequest( req, res, next ){

        res.send( `Hello world at: ${this.id}` );
    }

}

module.exports = Microservice;