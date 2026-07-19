import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('.output/public');
const assetsDir = path.join(publicDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error("Assets folder not found!");
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('styles-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error("Main JS or CSS asset not found!", { jsFile, cssFile });
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Brahmagupta Connected Campus</title>
    <link rel="stylesheet" href="./assets/${cssFile}" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;750;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Fira+Code:wght@300..700&display=swap" rel="stylesheet" />
    <script>
      window.$_TSR = window.$_TSR || {
        matches: [],
        manifest: { routes: {} }
      };
    </script>
  </head>
  <body class="bg-[#F8FAFC]">
    <div id="app"></div>
    <script type="module" src="./assets/${jsFile}"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), html);
console.log(`Successfully created index.html linking to assets/${jsFile} and assets/${cssFile}`);
