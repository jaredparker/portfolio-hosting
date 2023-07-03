
import { ConfigError } from '../errors.js';

import SrcLocal from './local.js';
import SrcSafeLocal from './safe-local.js';

const sources = {
    'local': SrcLocal,
    'safe-local': SrcSafeLocal
}

export default class Sources {

    static create( config ){
        if( !sources[config.kind] ) throw new ConfigError( `Source kind not found: ${config.kind}` );

        return new sources[config.kind]( config );
    }

}