import { callBackend } from "./errors";

export type MigrationStatus = {
  databasePath: string;
  applied: boolean;
  tables: string[];
};

export type RecordQuery = {
  kind?: string;
  search?: string;
  limit?: number;
};

export type RecordData = {
  id: string;
  kind: string;
  title: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecordInput = {
  kind: string;
  title: string;
  payload: unknown;
};

export type UpdateRecordInput = {
  kind?: string;
  title?: string;
  payload?: unknown;
};

export type ExportFormat = "json";

export type ImportResult = {
  imported: number;
  skipped: number;
};

export function runMigrations(): Promise<MigrationStatus> {
  return callBackend<MigrationStatus>("run_migrations");
}

export function getRecords(query: RecordQuery = {}): Promise<RecordData[]> {
  return callBackend<RecordData[]>("get_records", { query });
}

export function createRecord(input: CreateRecordInput): Promise<RecordData> {
  return callBackend<RecordData>("create_record", { input });
}

export function updateRecord(
  id: string,
  patch: UpdateRecordInput,
): Promise<RecordData> {
  return callBackend<RecordData>("update_record", { id, patch });
}

export function deleteRecord(id: string): Promise<boolean> {
  return callBackend<boolean>("delete_record", { id });
}

export function exportData(format: ExportFormat): Promise<string> {
  return callBackend<string>("export_data", { format });
}

export function importData(
  contents: string,
  format: ExportFormat,
): Promise<ImportResult> {
  return callBackend<ImportResult>("import_data", { contents, format });
}
