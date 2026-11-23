/**
 * ApplyMate Extension — Shared Message Types
 *
 * These types define the message contract between:
 *   content script <-> background service worker <-> popup
 *
 * Using a strict discriminated union keeps Safari's extension API
 * usage predictable and type-safe across all scripts.
 */

export type MessageType =
  | "PAGE_INFO"       // content → background: report page title + URL
  | "PAGE_INFO_REQ"   // popup → background: request current tab info
  | "PAGE_INFO_RES"   // background → popup: respond with current tab info
  | "PING"            // popup → background: health check
  | "PONG";           // background → popup: health check response

export interface PageInfoPayload {
  title: string;
  url: string;
  host: string;
  timestamp: number;
}

export interface Message<T extends MessageType = MessageType, P = unknown> {
  type: T;
  payload?: P;
}

export type PageInfoMessage = Message<"PAGE_INFO", PageInfoPayload>;
export type PageInfoReqMessage = Message<"PAGE_INFO_REQ">;
export type PageInfoResMessage = Message<"PAGE_INFO_RES", PageInfoPayload | null>;
export type PingMessage = Message<"PING">;
export type PongMessage = Message<"PONG", { version: string }>;

export type AnyMessage =
  | PageInfoMessage
  | PageInfoReqMessage
  | PageInfoResMessage
  | PingMessage
  | PongMessage;

