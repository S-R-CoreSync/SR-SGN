import { describe, it, expect } from "vitest";
import { extractRssImageUrls } from "../extractor";

describe("extractRssImageUrls", () => {
  const channelLogo = "https://example.com/static/logo.png";

  it("uses only item-level media and ignores the channel logo", () => {
    const item = `<item>
      <media:content url="https://example.com/photos/story.jpg" medium="image" type="image/jpeg" />
      <enclosure url="https://example.com/audio/talk.mp3" type="audio/mpeg" />
    </item>`;
    const content = `<img src="${channelLogo}" /><img src="https://example.com/photos/second.webp" />`;
    expect(extractRssImageUrls(item, content, channelLogo)).toEqual([
      "https://example.com/photos/story.jpg",
      "https://example.com/photos/second.webp",
    ]);
  });

  it("drops generic icons and duplicate urls", () => {
    const item = `<item>
      <media:thumbnail url="https://example.com/photos/a.jpg" />
      <media:thumbnail url="https://example.com/photos/a.jpg" />
      <enclosure url="https://example.com/favicon.ico" type="image/x-icon" />
    </item>`;
    expect(extractRssImageUrls(item, "", null)).toEqual(["https://example.com/photos/a.jpg"]);
  });

  it("returns nothing when the item only carries the channel image", () => {
    const item = "<item><title>Story</title></item>";
    expect(extractRssImageUrls(item, `<img src="${channelLogo}" />`, channelLogo)).toEqual([]);
  });
});
