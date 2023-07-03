
export default class Terminal {

    constructor( workdir, env ){
        this.workdir = workdir;
        this.env = {
            ...process.env,
            ...env
        }
        this.process = null;
    }

    async run(){}
    async kill(){}
}