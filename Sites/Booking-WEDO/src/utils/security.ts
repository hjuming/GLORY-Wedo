export const verifyWebhookSignature = async (
    signature: string,
    timestamp: string,
    body: string, // Raw body string
    secret: string
): Promise<boolean> => {
    // 1. Check Timestamp (5 minute window)
    const now = Date.now();
    const reqTime = parseInt(timestamp, 10);
    if (isNaN(reqTime)) return false;

    const fiveMinutes = 5 * 60 * 1000;
    if (Math.abs(now - reqTime) > fiveMinutes) {
        console.error("Webhook Timestamp Expired");
        return false;
    }

    // 2. Compute HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );

    const data = encoder.encode(body + timestamp);
    const signatureBytes = hexToBytes(signature);

    return await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        data
    );
};

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

export async function computeSignature(
    body: string,
    timestamp: string,
    secret: string
): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const data = encoder.encode(body + timestamp);
    const signature = await crypto.subtle.sign("HMAC", key, data);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
