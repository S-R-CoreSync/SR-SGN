async function test() {
  const url = 'https://scontent-ams2-1.xx.fbcdn.net/v/t39.30808-6/790269058_122135261535143384_4317016590361110045_n.jpg?stp=dst-jpg_p720x720_tt6&_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_ohc=ahWiqAreNbQQ7kNvwH3vM12&_nc_oc=Adqtv09_Ct5LGufNaN1xOnWJoIX7gHwE4fDxQbUW1NWUdaHhP3A-ykkz40XIltSTITVUkazFNGhV5znAOJ5fjh8h&_nc_zt=23&_nc_ht=scontent-ams2-1.xx&edm=AKIiGfEEAAAA&_nc_gid=dvyndQRbbhKbDv0B9fNAPw&_nc_tpa=Q5bMBQKBDn-p8JnP0ZqZpUKRfIJL1BF9a15lLSQcIyYWBSDHPhNnLsOd3ucSNKnsFuOqUG2ac3mQjBv9&oh=00_AQIndOaPp7HYMVTZW2ltffxeKj_RfEmDVHcuUY0yLx7XDQ&oe=6AA22B97';
  try {
    const r1 = await fetch(url);
    console.log('Status without Referer:', r1.status);
    const r2 = await fetch(url, { headers: { 'Referer': 'https://sgn-indol.vercel.app/' } });
    console.log('Status with Vercel Referer:', r2.status);
    const r3 = await fetch(url, { headers: { 'Referer': 'https://www.facebook.com/' } });
    console.log('Status with FB Referer:', r3.status);
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}
test();
