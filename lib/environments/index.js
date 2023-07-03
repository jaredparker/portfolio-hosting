
import { ConfigError } from '../errors.js';

import EnvStaticWeb from './static-web.js';
import EnvNodeJSWeb from './nodejs-web.js';

const environments = {
    'static-web': EnvStaticWeb,
    'nodejs-web': EnvNodeJSWeb,
}

export default class Environments {

    static create( config, workdir ){
        if( !environments[config.kind] ) throw new ConfigError( `Environment kind not found: ${config.kind}` );

        return new environments[config.kind]( config, workdir );
    }

}