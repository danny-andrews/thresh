import mkdirp from 'mkdirp';
import {promisify} from 'util';
import fs from 'fs';
import {unthrow} from './util';

export const readFile = promisify(fs.readFile);

export const writeFile = promisify(fs.writeFile);

export const getFileStats = promisify(fs.stat);

export const mkdir = promisify(mkdirp);

export const parseJSON = unthrow(JSON.parse);
