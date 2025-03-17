# InflateJS

A TypeScript application that takes minified JavaScript and "unminifies" it, making it easily readable by restoring proper formatting, improving variable names, and inferring types.

## Features

- **Code Formatting**: Automatically restructures minified code with proper indentation, line breaks, and consistent style
- **Variable Renaming**: Intelligently renames minified variables (like `a`, `b`, `c`) to more meaningful names (`param`, `value`, `item`, etc.)
- **Function Formatting**: Converts condensed function expressions to properly formatted block statements
- **Scope-Aware Renaming**: Respects variable scopes when renaming identifiers
- **Type Inference**: Infers TypeScript types for variables and function parameters

## Installation

### Prerequisites

- Node.js and npm installed on your system

### Local Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/inflatejs.git
   cd inflatejs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## Usage

### Basic Usage

```bash
# Using npx with ts-node (during development)
npx ts-node src/index.ts <input-file> [output-file]

# Using the built version
node dist/index.js <input-file> [output-file]
```

If you don't specify an output file, it will create one with the same name as the input file but with `.unminified.js` or `.unminified.ts` appended.

### Options

- `--no-rename`: Disable variable renaming, only format the code
- `--infer-types`: Enable type inference to add TypeScript type annotations
- `--typescript`: Output TypeScript code (.ts extension)

### Examples

```bash
# Basic usage - format and rename variables
npx ts-node src/index.ts minified.js readable.js

# Format only, without variable renaming
npx ts-node src/index.ts minified.js readable.js --no-rename

# Format and infer types, output as TypeScript
npx ts-node src/index.ts minified.js readable.ts --infer-types --typescript
```

## How It Works

1. **Parsing**: Uses Babel parser to convert minified JavaScript into an Abstract Syntax Tree (AST)
2. **Transformation**: Analyzes and transforms the AST to improve readability
3. **Variable Renaming**: Identifies minified variable names and replaces them with more descriptive ones
4. **Type Inference**: Infers TypeScript types for variables and function parameters
5. **Code Generation**: Generates formatted JavaScript or TypeScript code from the transformed AST
6. **Formatting**: Applies Prettier for additional formatting improvements

## Limitations

- Cannot recover original variable names (uses generic names based on context)
- May not perfectly handle very complex or obfuscated JavaScript code
- Does not add comments or documentation to the code

## License

ISC

## Contributing

Feel free to submit issues or pull requests to help improve this tool!