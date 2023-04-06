
import path from 'path';
import { fileURLToPath } from 'url';

export function getDirname( metaURL ){
    return path.dirname( fileURLToPath( metaURL ) );
}