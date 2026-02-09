
/**
 * Calculates the average luminance of an image region.
 * Returns 'light' or 'dark' based on threshold.
 */
export async function analyzeImageLuminance(
    imageUrl: string,
    region: { x: number; y: number; width: number; height: number; containerWidth: number; containerHeight: number }
): Promise<{ luminance: number; perception: 'light' | 'dark' }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Calculate actual pixel coordinates from the relative layout region
            // region is in screen pixels (from the editor canvas), we need to map to image natural dimensions
            // But wait, the image in the editor might be object-fit: cover.
            // This is complex. For 'cover', we need to simulate the CSS placement.

            // SIMPLIFICATION:
            // For now, let's assume we Analyze what's *rendered* on a canvas if we can.
            // But we don't have access to the main canvas easily.
            // Let's try to map the relative percentage.

            // Canvas size should match the check resolution (e.g. 100x100 is enough for separate check)
            // But to be accurate we need the aspect ratio match.

            // Let's map the text region percents to the image percents assuming "Center Crop" (Cover).

            // 1. Calculate Image Aspect and Container Aspect
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const contAspect = region.containerWidth / region.containerHeight;

            let renderWidth, renderHeight, offsetX, offsetY;

            if (imgAspect > contAspect) {
                // Image is wider than container: Vertical fit, Horizontal crop
                renderHeight = region.containerHeight;
                renderWidth = region.containerHeight * imgAspect;
                offsetY = 0;
                offsetX = (renderWidth - region.containerWidth) / 2;
            } else {
                // Image is taller than container: Horizontal fit, Vertical crop
                renderWidth = region.containerWidth;
                renderHeight = region.containerWidth / imgAspect;
                offsetX = 0;
                offsetY = (renderHeight - region.containerHeight) / 2;
            }

            // Now we define the crop rectangle on this "virtual" rendered image
            // The text is at region.x, region.y (relative to container)
            // We want to sample the pixels under this rect.

            // Ideally we draw the image shifted by -offsetX, -offsetY
            canvas.width = region.width;
            canvas.height = region.height;

            // Draw image such that the correct part falls onto the 0,0,width,height canvas
            // source coordinates?

            // Let's use simpler canvas draw:
            // ctx.drawImage(img, dx, dy, dWidth, dHeight)
            // We need to draw the image shifted so that (region.x, region.y) is at (0,0)

            const drawX = -(offsetX + region.x);
            const drawY = -(offsetY + region.y);

            ctx.drawImage(img, drawX, drawY, renderWidth, renderHeight);

            // Now get data
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let totalLum = 0;
                let pixels = 0;

                // Sample every 4th pixel for speed
                for (let i = 0; i < data.length; i += 4 * 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    // const a = data[i + 3]; // Ignore alpha for now, assume opaque background or white base

                    // Rec. 709 luminance
                    const tum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    totalLum += tum;
                    pixels++;
                }

                const avgLum = pixels > 0 ? totalLum / pixels : 128; // Default grey

                resolve({
                    luminance: avgLum,
                    perception: avgLum > 128 ? 'light' : 'dark'
                });

            } catch (e) {
                // CORS issues often happen here
                console.warn("Auto-Contrast CORS error", e);
                // Fallback: assume light background if failed (safe bet for black text)
                resolve({ luminance: 200, perception: 'light' });
            }
        };

        img.onerror = (e) => reject(e);
    });
}
