import type { ChatMessage } from "./types";

/**
 * Client-side share links — no backend / database.
 *
 * A conversation (or a whole project) is serialized to JSON, gzip-compressed in
 * the browser, and base64url-encoded into the URL hash fragment. Anyone opening
 * `/share#<data>` reconstructs the read-only view entirely on their own device;
 * the data never touches our server (the hash isn't sent in HTTP requests).
 *
 * Trade-off: the whole conversation lives in the link, so very large chats make
 * long URLs. For typical text chats the compressed payload stays small.
 */

export interface SharedChat {
  title: string;
  messages: ChatMessage[];
}

export interface SharePayload {
  v: 1;
  kind: "chat" | "project";
  title: string;
  createdAt: number;
  /** Present when kind === "chat". */
  messages?: ChatMessage[];
  /** Present when kind === "project". */
  chats?: SharedChat[];
}

/* ---------------------------- base64url helpers ---------------------------- */

function bytesToBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ------------------------------ gzip helpers ------------------------------ */

async function gzip(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/* -------------------------------- encode / decode -------------------------- */

export async function encodeShare(payload: SharePayload): Promise<string> {
  const compressed = await gzip(JSON.stringify(payload));
  return bytesToBase64Url(compressed);
}

export async function decodeShare(encoded: string): Promise<SharePayload> {
  const json = await gunzip(base64UrlToBytes(encoded));
  const parsed = JSON.parse(json) as SharePayload;
  if (!parsed || parsed.v !== 1 || !parsed.kind) {
    throw new Error("Unrecognized share link.");
  }
  return parsed;
}

/** Build the full shareable URL from a payload. */
export async function buildShareUrl(payload: SharePayload): Promise<string> {
  const encoded = await encodeShare(payload);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share#${encoded}`;
}
