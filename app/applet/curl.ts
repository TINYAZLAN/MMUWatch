async function run() {
  const res = await fetch("https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", { method: "HEAD" });
  console.log(res.status);
}
run();
