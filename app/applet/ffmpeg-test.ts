import https from 'https';
https.get('https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js', (res) => {
  console.log('JS Code:', res.statusCode);
});
https.get('https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm', (res) => {
  console.log('WASM Code:', res.statusCode);
});
