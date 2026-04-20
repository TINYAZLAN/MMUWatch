import https from 'https';
https.get('https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', (res) => {
  console.log('Status Code:', res.statusCode);
}).on('error', (e) => {
  console.error(e);
});
