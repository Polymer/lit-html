import {programFromTsConfig} from './typescript.js';
import {resolve as resolvePath} from 'path';
import { compileLitTemplates } from './template-transform.js';

export const hello = () => 'Hello';

export const compile = async (path: string) => {
  const configPath = resolvePath(path);
  const program = programFromTsConfig(configPath);
  for (const file of program.getSourceFiles()) {
    program.emit(file, undefined, undefined, undefined, {
      before: [compileLitTemplates()],
    });
  }
};

export interface Config {
  /**
   * Base directory on disk that contained the config file. Used for resolving
   * paths relative to the config file.
   */
  baseDir: string;

  /**
   * Resolve a filepath relative to the directory that contained the config
   * file.
   */
  resolve: (path: string) => string;
}
