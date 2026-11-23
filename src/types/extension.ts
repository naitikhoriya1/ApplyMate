// Shared Extension types for ApplyMate Safari Extension

export type ExtensionMessageType =
  | "WEBPAGE_DETECTED"
  | "GET_PROFILE"
  | "AUTOFILL_TRIGGER"
  | "STATUS_PING";

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType;
  payload?: T;
  title?: string;
  url?: string;
}

export interface AutofillFieldMapping {
  fieldId: string;
  formKey: string;
  value: string;
  confidence: number;
}

export interface ExtensionStatus {
  enabled: boolean;
  version: string;
  hasProfileData: boolean;
}

