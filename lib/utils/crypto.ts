/**
 * Symmetric XOR cipher with conversation ID key derivation.
 * Encrypts private chat messages before sending them to the database.
 * Transparently falls back to plain text if the message is not prefixed with "enc:".
 */

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Encode(input: string): string {
  let str = input;
  let output = "";
  for (
    let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error(
        "'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."
      );
    }
    block = (block << 8) | charCode;
  }
  return output;
}

function base64Decode(input: string): string {
  let str = input.replace(/=+$/, "");
  let output = "";
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (
    let bc = 0, bs = 0, buffer, i = 0;
    (buffer = str.charAt(i++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function xorCipher(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

export function encryptBody(text: string, conversationId: string): string {
  if (!text) return "";
  try {
    const cipher = xorCipher(text, conversationId);
    // Base64 encode the cipher text safely handling UTF-8 characters
    const encoded = base64Encode(encodeURIComponent(cipher));
    return `enc:${encoded}`;
  } catch (err) {
    console.error("Encryption failed, sending as plain text:", err);
    return text;
  }
}

export function decryptBody(cipherText: string, conversationId: string): string {
  if (!cipherText || !cipherText.startsWith("enc:")) {
    return cipherText;
  }
  try {
    const base64 = cipherText.slice(4);
    const decoded = decodeURIComponent(base64Decode(base64));
    return xorCipher(decoded, conversationId);
  } catch {
    // If decryption fails, return the original cipher text
    return cipherText;
  }
}
