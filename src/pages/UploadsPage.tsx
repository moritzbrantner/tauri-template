import { ChangeEvent, DragEvent, useState } from "react";
import type { Messages } from "../app/messages";
import { Icon } from "../components/Icon";

type UploadsPageProps = {
  t: Messages;
};

type FileItem = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export function UploadsPage({ t }: UploadsPageProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(fileList: FileList) {
    const nextFiles = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    }));

    setFiles((current) => [...dedupeFiles([...current, ...nextFiles])]);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) {
      addFiles(event.currentTarget.files);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <section className="content-stack">
      <div className="section-heading">
        <p className="eyebrow">Workspace</p>
        <h1>{t.uploads.title}</h1>
        <p>{t.uploads.description}</p>
      </div>

      <label
        className={`drop-zone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <Icon name="upload" />
        <strong>{t.uploads.drop}</strong>
        <span>{t.uploads.choose}</span>
        <input multiple onChange={handleInput} type="file" />
      </label>

      <div className="upload-list">
        <div className="list-heading">
          <h2>{t.uploads.choose}</h2>
          <button className="secondary-action" disabled={files.length === 0} onClick={() => setFiles([])} type="button">
            {t.uploads.clear}
          </button>
        </div>
        {files.length === 0 ? (
          <p className="empty-state">{t.uploads.empty}</p>
        ) : (
          <ul>
            {files.map((file) => (
              <li key={file.id}>
                <span>{file.name}</span>
                <small>
                  {file.type} / {formatBytes(file.size)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function dedupeFiles(files: FileItem[]) {
  return Array.from(new Map(files.map((file) => [file.id, file])).values());
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
