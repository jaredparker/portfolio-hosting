
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logLevels = {
    levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        request: 4,
        debug: 5,
        trace: 6
    },
    colors: {
        fatal: '\x1b[31m',
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[32m',
        request: '\x1b[36m',
        debug: '\x1b[34m',
        trace: '\x1b[35m'
    }
};

// Formats

const consoleFormat = winston.format.combine(
    // winston.format.colorize({ colors }), 
    winston.format.timestamp({
        format:"YY-MM-DD HH:mm:ss"
    }),
    winston.format.printf(
        info => {
            const color = logLevels.colors[info.level];
            const colorize = text => `\x1b[0m${color}${text}\x1b[0m`;
            return `[${colorize(info.timestamp)}][${colorize(info.level)}] ${info.message}`
        }
    )
);
const fileFormat = winston.format.combine( winston.format.timestamp(), winston.format.json() );

// Transports

const consoleTraceTransport = new winston.transports.Console({
    level: 'trace',
    format: consoleFormat
});

const consoleInfoTransport = new winston.transports.Console({
    level: 'info',
    format: consoleFormat
});

const fileTransport = new winston.transports.DailyRotateFile({
    level: 'debug',
    dirname: path.join( __dirname, '..', 'logs' ),
    filename: '%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat
});

const transports = process.env.NODE_ENV == 'production' ? [ fileTransport, consoleInfoTransport ] : [ consoleTraceTransport ];

// Logger

const logger = winston.createLogger({
    levels: logLevels.levels,
    transports
});

module.exports = logger;