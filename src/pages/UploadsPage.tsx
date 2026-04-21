import { ChangeEvent, DragEvent, useState } from "react";
import type { Messages } from "../app/messages";
import { Icon } from "../components/Icon";
import * as styles from "../styles";

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
    <section className={styles.contentStackClass}>
      <div className={styles.sectionHeadingClass}>
        <p className={styles.eyebrowClass}>Workspace</p>
        <h1 className={styles.pageTitleClass}>{t.uploads.title}</h1>
        <p className={styles.mutedCopyClass}>{t.uploads.description}</p>
      </div>

      <label
        className={styles.cx(
          styles.dropZoneClass,
          isDragging && styles.dropZoneDraggingClass,
        )}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="text-4xl text-[#2f6687] dark:text-[#8ac8e5]">
          <Icon name="upload" />
        </span>
        <strong className="text-xl text-[#1d2520] dark:text-[#f2f5ef]">
          {t.uploads.drop}
        </strong>
        <span>{t.uploads.choose}</span>
        <input
          className={styles.hiddenFileClass}
          multiple
          onChange={handleInput}
          type="file"
        />
      </label>

      <div className={styles.listPanelClass}>
        <div className={styles.listHeadingClass}>
          <h2 className="text-lg font-bold">{t.uploads.choose}</h2>
          <button
            className={styles.secondaryActionClass}
            disabled={files.length === 0}
            onClick={() => setFiles([])}
            type="button"
          >
            {t.uploads.clear}
          </button>
        </div>
        {files.length === 0 ? (
          <p className={styles.emptyStateClass}>{t.uploads.empty}</p>
        ) : (
          <ul className={styles.plainListClass}>
            {files.map((file) => (
              <li className={styles.listItemClass} key={file.id}>
                <span className={styles.listItemTitleClass}>{file.name}</span>
                <small className={styles.listItemMetaClass}>
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
