// This is a patch script to fix the math-intrinsics package
const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'node_modules', '.pnpm', 'math-intrinsics@1.1.0', 'node_modules', 'math-intrinsics');
const signJsPath = path.join(packagePath, 'sign.js');

if (fs.existsSync(signJsPath)) {
  let content = fs.readFileSync(signJsPath, 'utf8');
  
  // Replace relative import with absolute path
  content = content.replace("var $isNaN = require('./isNaN')", "var $isNaN = require('math-intrinsics/isNaN')");
  
  fs.writeFileSync(signJsPath, content);
  console.log('Successfully patched math-intrinsics/sign.js');
} else {
  console.error('Could not find math-intrinsics/sign.js');
}