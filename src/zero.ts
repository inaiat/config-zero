/* eslint-disable no-console */
import chalk from 'chalk'
import { Command } from 'commander'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentPath = fileURLToPath(import.meta.url)
const dirName = dirname(currentPath)

const createServiceName = (serviceName: string) => `SERVICE_NAME=${serviceName}`

const tsLoader = (serviceName: string) =>
  `${createServiceName(serviceName)} FASTIFY_AUTOLOAD_TYPESCRIPT=true node --enable-source-maps --import=tsx/esm`

const enviFileOptions = (envFile: string | boolean) => (envFile === false) ? '' : `--env-file=${envFile}`

const buildStartCommand = (
  dist: string,
  initTracer: string,
  serviceName: string,
  envFile: string | boolean,
) => {
  const command = `pnpm tsc && ${createServiceName(serviceName)} node --enable-source-maps --import=${initTracer} ${
    enviFileOptions(envFile)
  } ${dist}`
  console.log(chalk.green('Zero dev:\n', command))
  return command
}

const buildDevCommand = (
  entryFile: string,
  initTracer: string,
  serviceName: string,
  envFile: string | boolean,
) => {
  const command = `development=true ${tsLoader(serviceName)} --import=${initTracer} ${
    enviFileOptions(envFile)
  } --watch ${entryFile}`
  console.log(chalk.green('Starting development environment with command:\n', command))
  return command
}

function getPackageName(): string {
  const packagePath = resolve(process.cwd(), 'package.json')
  try {
    const packageData = JSON.parse(readFileSync(packagePath, 'utf8')) as Record<string, unknown>
    return packageData.name as string
  } catch {
    console.error('Could not find package.json. Returning default name "config-zero"')
    return 'config-zero'
  }
}

const executeScript = (script: string) => {
  const child = spawn(script, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  })

  child.on('error', (err) => {
    console.error(chalk.red(`Error running script: ${err.message}`))
  })

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green(`Script "${script}" completed successfully.`))
    } else {
      console.error(chalk.red(`Script "${script}" failed with code ${code}.`))
    }
  })
}

// Initialize Commander
const program = new Command()

program
  .name('config-zero')
  .description('Zero CLI')
  .version('1.0.0')

program
  .command('dev')
  .description('Start development environment')
  .option('--entry-file', 'Entry file', 'src/index.ts')
  .option('--init-tracer', 'Do not initialize init-tracer', './init-tracer.mjs')
  .option('--service-name', 'Service name', getPackageName())
  .option('--env-file', 'Environment file', '.env')
  .option('--no-env-file', 'Do not use environment file')
  .action(
    (
      options: Readonly<
        { entryFile: string; initTracer: string; serviceName: string; envFile: string | boolean }
      >,
    ) => {
      const { entryFile, initTracer, serviceName, envFile } = options
      const script = buildDevCommand(entryFile, initTracer, serviceName, envFile)

      executeScript(script)
    },
  )

program
  .command('start')
  .description('Build and start local development environment')
  .option('--dist', 'Distribution folder', 'dist')
  .option('--init-tracer', 'Do not initialize init-tracer', './init-tracer.mjs')
  .option('--service-name', 'Service name', getPackageName())
  .option('--env-file', 'Environment file', '.env')
  .option('--no-env-file', 'Do not use environment file')
  .action((
    options: Readonly<
      { dist: string; initTracer: string; serviceName: string; envFile: string | boolean }
    >,
  ) => {
    const { dist, initTracer, serviceName, envFile } = options
    const script = buildStartCommand(dist, initTracer, serviceName, envFile)

    executeScript(script)
  })

program
  .command('test')
  .description('Run tests')
  .argument('[file]', 'File to test')
  .action((
    args,
  ) => {
    const script = `${tsLoader(getPackageName())} --test ${args}`
    console.log(chalk.green('Running tests...\n', script))
    executeScript(script)
  })

program
  .command('format')
  .argument('[command]', 'Dprint command', 'fmt')
  .description('Format code')
  .option('--config', 'Configuration file', join(dirName, 'dprint.json'))
  .action((args, options: Readonly<{ config: string }>) => {
    const { config } = options
    const script = `dprint ${args} --config ${config}`
    executeScript(script)
  })

program
  .command('lint')
  // .argument('[command]', 'Dprint command', 'fmt')
  .description('Lint code')
  .option('--config', 'Configuration file', join(dirName, 'eslint.config.mjs'))
  .action((options: Readonly<{ config: string }>) => {
    const { config } = options
    const script = `eslint --config ${config}`
    executeScript(script)
  })

program.parse()
