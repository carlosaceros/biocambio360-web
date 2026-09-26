/**
 * WhatsApp voice notes are Ogg/Opus, which Safari (and some older browsers) cannot play. When the
 * browser cannot, the note is decoded in the browser (WebAssembly) and re-wrapped as a WAV file.
 * Nothing is uploaded or stored: it is a local conversion for playback only.
 */

export function browserPlaysOggOpus(): boolean {
    if (typeof document === 'undefined') return true;
    return document.createElement('audio').canPlayType('audio/ogg; codecs=opus') !== '';
}

/**
 * Safari and every iOS browser (WebKit) claim they can play Ogg/Opus through canPlayType but fail
 * when playing, so the browser's own answer is not trusted there: the note is always converted.
 */
export function shouldConvertOgg(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const webkit = (/AppleWebKit/.test(ua) && !/Chrome\/|Chromium\/|Android/.test(ua)) || /CriOS|FxiOS|EdgiOS/.test(ua);
    return webkit || !browserPlaysOggOpus();
}

function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
    const numChannels = channels.length;
    const length = channels[0]?.length ?? 0;
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);
    const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    write(0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, length * numChannels * 2, true);
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let c = 0; c < numChannels; c++) {
            const s = Math.max(-1, Math.min(1, channels[c][i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            offset += 2;
        }
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

export async function oggOpusToWav(data: ArrayBuffer): Promise<Blob> {
    const { OggOpusDecoder } = await import('ogg-opus-decoder');
    const decoder = new OggOpusDecoder();
    try {
        await decoder.ready;
        const { channelData, sampleRate } = await decoder.decodeFile(new Uint8Array(data));
        return encodeWav(channelData, sampleRate);
    } finally {
        decoder.free();
    }
}
