# Sample images

**Add or replace images in `public/images/`** (that is what the dashboard serves).

Then run:

```bash
python scripts/generate_detections.py
```

The script mirrors `public/images/*.jpg` into this folder, runs YOLO, and writes JSON to `public/detections/`.

After swapping images, bump `ASSET_VERSION` in `lib/detectionUtils.ts` if the browser still shows old thumbnails.
