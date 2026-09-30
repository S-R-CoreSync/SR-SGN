import fs from "fs";

async function testFb() {
  const envContent = fs.readFileSync(".env", "utf8");
  const pageIdMatch = envContent.match(/FACEBOOK_PAGE_ID="?([^"\r\n]+)"?/);
  const tokenMatch = envContent.match(/FACEBOOK_PAGE_TOKEN="?([^"\r\n]+)"?/);

  if (!pageIdMatch || !tokenMatch) {
    console.log("No FB creds");
    return;
  }

  const pageId = pageIdMatch[1].trim();
  const token = tokenMatch[1].trim();

  const url = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,full_picture,created_time&limit=5&access_token=${token}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      console.log("FB Graph Error:", data.error.message);
    } else {
      console.log(`Success! Fetched ${data.data?.length} posts from Facebook:`);
      for (const p of data.data) {
        console.log(`- ${p.id}: ${p.message?.slice(0, 30)}... | pic: ${p.full_picture?.slice(0, 60)}...`);
      }
    }
  } catch (e: any) {
    console.log("FB fetch error:", e.message);
  }
}

testFb();
