#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve, extname } from 'path';
import { unminify } from './unminifier';

// Function to parse command line arguments
function parseArguments(args: string[]): { inputFile: string | undefined, outputFile: string | undefined, options: { renameVariables: boolean, inferTypes: boolean, outputFormat: 'js' | 'ts' } } {
  const options = {
    renameVariables: true,
    inferTypes: false,
    outputFormat: 'js' as 'js' | 'ts'
  };
  let inputFile: string | undefined;
  let outputFile: string | undefined;
  let outputExtension = '.js';

  args.forEach(arg => {
    if (arg === '--no-rename') {
      options.renameVariables = false;
    } else if (arg === '--infer-types') {
      options.inferTypes = true;
    } else if (arg === '--typescript') {
      options.outputFormat = 'ts';
      outputExtension = '.ts';
    } else if (!inputFile) {
      inputFile = resolve(arg);
    } else if (!outputFile) {
      outputFile = resolve(arg);
    }
  });

  if (!inputFile) {
    console.error('Error: No input file specified');
    process.exit(1);
  }

  if (!outputFile) {
    const inputExtension = extname(inputFile);
    const baseName = inputFile.slice(0, -inputExtension.length);
    outputFile = `${baseName}.unminified${outputExtension}`;
  } else if (options.outputFormat === 'ts' && !outputFile.endsWith('.ts')) {
    outputFile = outputFile.replace(/\.[^.]+$/, '.ts');
  }

  return { inputFile, outputFile, options };
}

// Function to log options
function logOptions(options: { renameVariables: boolean, inferTypes: boolean, outputFormat: 'js' | 'ts' }) {
  console.log(`Options: ${options.renameVariables ? 'Variable renaming enabled' : 'Variable renaming disabled'}`);
  console.log(`         ${options.inferTypes ? 'Type inference enabled' : 'Type inference disabled'}`);
  console.log(`         Output format: ${options.outputFormat.toUpperCase()}`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx inflatejs <input-file> [output-file] [options]');
    console.error('Options:');
    console.error('  --no-rename    Disable variable renaming');
    console.error('  --infer-types  Enable type inference');
    console.error('  --typescript   Output TypeScript code (.ts extension)');
    process.exit(1);
  }

  const { inputFile, outputFile, options } = parseArguments(args);

  try {
    const minifiedCode = readFileSync(inputFile!, 'utf-8');
    console.log(`Processing ${inputFile}...`);

    logOptions(options);

    const unminifiedCode = await unminify(minifiedCode, options);

    writeFileSync(outputFile!, unminifiedCode, 'utf-8');
    console.log(`Successfully unminified to ${outputFile}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Execute the main function and handle any unhandled promise rejections
main().catch(error => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});