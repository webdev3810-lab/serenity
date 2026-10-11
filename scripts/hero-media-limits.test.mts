import assert from "node:assert/strict";
import test from "node:test";
import {
  HERO_IMAGE_MAX_BYTES,
  HERO_VIDEO_MAX_BYTES,
  validateHeroMediaFile,
} from "../src/lib/heroMedia.ts";

test("hero images accept at most 5 MB", () => {
  assert.equal(HERO_IMAGE_MAX_BYTES, 5 * 1024 * 1024);
  assert.equal(validateHeroMediaFile({ contentType: "image/webp", size: HERO_IMAGE_MAX_BYTES }), null);
  assert.match(validateHeroMediaFile({ contentType: "image/webp", size: HERO_IMAGE_MAX_BYTES + 1 }) ?? "", /5 MB/);
});

test("hero videos accept at most 20 MB", () => {
  assert.equal(HERO_VIDEO_MAX_BYTES, 20 * 1024 * 1024);
  assert.equal(validateHeroMediaFile({ contentType: "video/mp4", size: HERO_VIDEO_MAX_BYTES }), null);
  assert.match(validateHeroMediaFile({ contentType: "video/mp4", size: HERO_VIDEO_MAX_BYTES + 1 }) ?? "", /20 MB/);
});
