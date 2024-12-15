# Build Instructions

To build the extension:

1. Ensure you have the required dependencies installed:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

This will create a .vsix file that can be installed in Windsurf.

## Installation

### Windsurf
To install the extension in Windsurf, use:
```bash
C:\Users\etgarcia\AppData\Local\Programs\Windsurf\bin\windsurf --install-extension claude-dev-2.2.2-et.vsix
```

Note: Make sure all dependencies are properly listed in package.json before packaging.
