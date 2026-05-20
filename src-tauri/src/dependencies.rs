use std::{
    env,
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;

use crate::errors::CommandResult;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDependencyReport {
    pub dependencies: Vec<SystemDependency>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDependency {
    pub name: String,
    pub required: bool,
    pub available: bool,
    pub version: Option<String>,
    pub resolved_path: Option<String>,
    pub message: Option<String>,
}

#[tauri::command]
pub fn check_system_dependencies() -> CommandResult<SystemDependencyReport> {
    Ok(SystemDependencyReport {
        dependencies: ["git", "bun", "cargo"]
            .into_iter()
            .map(|name| check_dependency(name, false))
            .collect(),
    })
}

fn check_dependency(name: &str, required: bool) -> SystemDependency {
    match Command::new(name).arg("--version").output() {
        Ok(output) if output.status.success() => {
            let version = parse_version_output(
                String::from_utf8_lossy(&output.stdout).as_ref(),
                String::from_utf8_lossy(&output.stderr).as_ref(),
            );

            SystemDependency {
                name: name.into(),
                required,
                available: true,
                version,
                resolved_path: resolve_in_path(name).map(|path| path.display().to_string()),
                message: None,
            }
        }
        Ok(output) => SystemDependency {
            name: name.into(),
            required,
            available: false,
            version: None,
            resolved_path: resolve_in_path(name).map(|path| path.display().to_string()),
            message: Some(format!(
                "`{name} --version` exited with status {}.",
                output.status
            )),
        },
        Err(error) => SystemDependency {
            name: name.into(),
            required,
            available: false,
            version: None,
            resolved_path: resolve_in_path(name).map(|path| path.display().to_string()),
            message: Some(error.to_string()),
        },
    }
}

fn parse_version_output(stdout: &str, stderr: &str) -> Option<String> {
    stdout
        .lines()
        .chain(stderr.lines())
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(str::to_string)
}

fn resolve_in_path(command: &str) -> Option<PathBuf> {
    let path_var = env::var_os("PATH")?;
    let candidates = candidate_names(command);

    env::split_paths(&path_var).find_map(|directory| {
        candidates
            .iter()
            .map(|candidate| directory.join(candidate))
            .find(|path| is_executable_candidate(path))
    })
}

fn candidate_names(command: &str) -> Vec<String> {
    if cfg!(windows) && Path::new(command).extension().is_none() {
        let path_ext = env::var("PATHEXT").unwrap_or_else(|_| ".EXE;.CMD;.BAT;.COM".into());
        path_ext
            .split(';')
            .filter(|extension| !extension.is_empty())
            .map(|extension| format!("{command}{extension}"))
            .collect()
    } else {
        vec![command.into()]
    }
}

fn is_executable_candidate(path: &Path) -> bool {
    path.is_file()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_version_prefers_stdout_first_line() {
        assert_eq!(
            parse_version_output("git version 2.43.0\nextra", "ignored"),
            Some("git version 2.43.0".into()),
        );
    }

    #[test]
    fn parse_version_falls_back_to_stderr() {
        assert_eq!(
            parse_version_output("", "tool 1.2.3\n"),
            Some("tool 1.2.3".into()),
        );
    }

    #[test]
    fn parse_version_ignores_empty_output() {
        assert_eq!(parse_version_output("\n", ""), None);
    }

    #[test]
    fn candidate_names_keeps_explicit_command_on_unix() {
        assert!(candidate_names("git").contains(&"git".into()));
    }
}
