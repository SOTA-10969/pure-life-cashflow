"use client";

// lib/fonts.ts
// Fetches Japanese font from CDN and returns as Base64 for jsPDF

const FONT_CDN_URL = "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf";

let cachedFontPromise: Promise<string | null> | null = null;

export async function loadJapaneseFont(): Promise<string | null> {
    // Return cached promise if exists
    if (cachedFontPromise) {
        return cachedFontPromise;
    }

    cachedFontPromise = (async (): Promise<string | null> => {
        try {
            console.log("[Font] Fetching Japanese font from CDN...");

            const response = await fetch(FONT_CDN_URL, {
                mode: 'cors',
                cache: 'force-cache'
            });

            if (!response.ok) {
                console.error(`[Font] Failed to fetch: ${response.status} ${response.statusText}`);
                return null;
            }

            const arrayBuffer = await response.arrayBuffer();

            // Check if we got valid data
            if (arrayBuffer.byteLength < 10000) {
                console.error(`[Font] Invalid font data: only ${arrayBuffer.byteLength} bytes`);
                return null;
            }

            console.log(`[Font] Received ${arrayBuffer.byteLength} bytes, converting to Base64...`);

            // Convert ArrayBuffer to Base64
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.byteLength; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);

            console.log(`[Font] Base64 conversion complete. Length: ${base64.length}`);
            return base64;

        } catch (error) {
            console.error("[Font] Error loading Japanese font:", error);
            // Clear cache on error so we can retry
            cachedFontPromise = null;
            return null;
        }
    })();

    return cachedFontPromise;
}
