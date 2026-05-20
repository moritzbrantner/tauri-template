import { callBackend } from "./errors";

export type SystemDependency = {
  name: string;
  required: boolean;
  available: boolean;
  version?: string | null;
  resolvedPath?: string | null;
  message?: string | null;
};

export type SystemDependencyReport = {
  dependencies: SystemDependency[];
};

export function checkSystemDependencies(): Promise<SystemDependencyReport> {
  return callBackend<SystemDependencyReport>("check_system_dependencies");
}
