
/**
 * Utility functions for handling image data and verification
 */

/**
 * Checks if the provided Data URL contains valid PNG markers (IHDR, IEND)
 * This is a basic check to ensure the binary data isn't blatantly corrupted.
 */
export function isValidPngDataUrl(dataUrl: string): boolean {
    if (!dataUrl.startsWith('data:image/png;base64,')) {
        return false;
    }

    try {
        const base64Content = dataUrl.split(',')[1];
        const binaryString = atob(base64Content);
        // PNG signature: ‰PNG\r\n\x1a\n (decimal: 137 80 78 71 13 10 26 10)
        // We check for "PNG" (lines 1-3)
        const hasPngSignature = binaryString.substring(1, 4) === 'PNG';

        // Check for "IEND" at the end (roughly)
        // IEND chunk is usually at the very end.
        const hasIend = binaryString.includes('IEND');

        // Check for "IHDR" chunk
        const hasIhdr = binaryString.includes('IHDR');

        return hasPngSignature && hasIhdr && hasIend;
    } catch (e) {
        console.error("Failed to parse PNG data", e);
        return false;
    }
}

/**
 * Converts a Base64 Data URL to a Blob for clipboard operations
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
}

/**
 * Copies the given blob to the system clipboard
 */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
    try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        throw new Error('クリップボードへのコピーに失敗しました');
    }
}
