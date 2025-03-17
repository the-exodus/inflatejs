#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve, extname } from 'path';
import { unminify } from './unminifier';

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

  // Parse arguments
  const options = {
    renameVariables: true,
    inferTypes: false,
    outputFormat: 'js' as 'js' | 'ts'
  };

  // Input/output files
  let inputFile: string | undefined;
  let outputFile: string | undefined;
  let outputExtension = '.js';
  
  // Process command line arguments
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
    // Determine output file name based on input file and output format
    const inputExtension = extname(inputFile);
    const baseName = inputFile.slice(0, -inputExtension.length);
    outputFile = `${baseName}.unminified${outputExtension}`;
  } else if (options.outputFormat === 'ts' && !outputFile.endsWith('.ts')) {
    // Ensure the output file has .ts extension if TypeScript output is requested
    outputFile = outputFile.replace(/\.[^.]+$/, '.ts');
  }
  
  try {
    const minifiedCode = readFileSync(inputFile, 'utf-8');
    console.log(`Processing ${inputFile}...`);
    
    // Log the options being used
    console.log(`Options: ${options.renameVariables ? 'Variable renaming enabled' : 'Variable renaming disabled'}`);
    console.log(`         ${options.inferTypes ? 'Type inference enabled' : 'Type inference disabled'}`);
    console.log(`         Output format: ${options.outputFormat.toUpperCase()}`);
    
    const unminifiedCode = await unminify(minifiedCode, options);
    
    writeFileSync(outputFile, unminifiedCode, 'utf-8');
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