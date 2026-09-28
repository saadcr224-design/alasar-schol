import {copyFile,mkdir,cp} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
await mkdir('public',{recursive:true});
await copyFile(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),'public/pdf.worker.min.mjs');

await cp(new URL('../standard_fonts/','file://'+require.resolve('pdfjs-dist/build/pdf.mjs')),'public/pdf-fonts',{recursive:true});
await cp(new URL('../cmaps/','file://'+require.resolve('pdfjs-dist/build/pdf.mjs')),'public/pdf-cmaps',{recursive:true});
