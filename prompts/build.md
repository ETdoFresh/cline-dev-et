# Build Instructions

To build the VSCode extension:

1. Ensure you have the required dependencies installed:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

This will create a .vsix file that can be installed in VSCode.

Note: Make sure all dependencies are properly listed in package.json before packaging.
