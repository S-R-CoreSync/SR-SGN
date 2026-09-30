async function inspect() {
  const res = await fetch("https://sgn-drab.vercel.app/");
  const html = await res.text();
  console.log("HTML length:", html.length);
  
  // Check if our new components / links exist on the live site
  const hasEmergency = html.includes("/emergency");
  const hasPrayers = html.includes("/prayers");
  const hasInburgering = html.includes("/inburgering");
  const hasBriefScanner = html.includes("brief-scanner");
  
  console.log("Has /emergency link:", hasEmergency);
  console.log("Has /prayers link:", hasPrayers);
  console.log("Has /inburgering link:", hasInburgering);
  console.log("Has brief-scanner:", hasBriefScanner);

  // Check what images are present in the HTML
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
  console.log(`\nFound ${imgMatches.length} <img> tags in homepage HTML:`);
  imgMatches.forEach(src => console.log("-", src.slice(0, 100)));
}

inspect().catch(console.error);
