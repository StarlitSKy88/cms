import boxen from 'boxen';
import { createCommand } from 'commander';
import chalk from 'chalk';
import type { StrapiCommand } from '../types';

import { build as nodeBuild, BuildOptions } from '../../node/build';
import { handleUnexpectedError } from '../../node/core/errors';

interface BuildCLIOptions extends BuildOptions {
  /**
   * @deprecated use `minify` instead
   */
  optimization?: boolean;
}

const action = async (options: BuildCLIOptions) => {
  try {
    if (typeof process.env.STRAPI_ENFORCE_SOURCEMAPS !== 'undefined') {
      options.logger.warn(
        "[@strapi/strapi]: STRAPI_ENFORCE_SOURCEMAPS is now deprecated. You can enable sourcemaps by passing '--sourcemaps' to the build command."
      );
    }
    if (typeof options.optimization !== 'undefined' && options.optimization !== true) {
      options.logger.warn(
        "[@strapi/strapi]: The optimization argument is now deprecated. Use '--minify' instead."
      );
    }

    if (options.bundler !== 'webpack') {
      options.logger.log(
        boxen(
          `Using ${chalk.bold(
            chalk.underline(options.bundler)
          )} as a bundler is considered experimental, use at your own risk. If you do experience bugs, open a new issue on Github – https://github.com/strapi/strapi/issues/new?template=BUG_REPORT.md`,
          {
            title: 'Warning',
            padding: 1,
            margin: 1,
            align: 'center',
            borderColor: 'yellow',
            borderStyle: 'bold',
          }
        )
      );
    }

    const envSourceMaps = process.env.STRAPI_ENFORCE_SOURCEMAPS === 'true';

    /**
     * ENFORCE NODE_ENV to production when building
     */
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

    if (process.env.NODE_ENV !== 'production') {
      options.logger.warn(
        '[@strapi/strapi]: The NODE_ENV is not set to production. This may result in unexpected behavior.'
      );
    }

    await nodeBuild({
      ...options,
      minify: options.optimization ?? options.minify,
      sourcemaps: options.sourcemaps || envSourceMaps,
    });
  } catch (err) {
    handleUnexpectedError(err);
  }
};

/**
 * `$ strapi build`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('build')
    .option('--bundler [bundler]', 'Bundler to use (webpack or vite)', 'webpack')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--ignore-prompts', 'Ignore all prompts', false)
    .option('--minify', 'Minify the output', true)
    .option('--no-optimization', '[deprecated]: use minify instead')
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'Produce sourcemaps', false)
    .option('--stats', 'Print build statistics to the console', false)
    .description('Build the strapi admin app')
    .action(async (options: BuildCLIOptions) => {
      return action({ ...options, ...ctx });
    });
};

export { command };
