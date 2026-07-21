import { useRef, useState, type DragEvent } from 'react';
import { applyImport, parseImportAuto, type ParsedImport } from '../../lib/importExport';
import { useToast } from '../../hooks/useToast';
import './import-export.scss';

interface ImportDialogProps {
  onClose: () => void;
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const toast = useToast();
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [applying, setApplying] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    setFileName(file.name);
    setParsed(parseImportAuto(await file.text()));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const apply = async () => {
    if (!parsed) return;
    setApplying(true);
    const result = await applyImport(parsed.drafts);
    setApplying(false);
    if (result.failed.length === 0) {
      toast.success(`Imported ${result.imported} cookie${result.imported === 1 ? '' : 's'}`);
    } else {
      toast.error(`Imported ${result.imported}, ${result.failed.length} failed (e.g. ${result.failed[0].reason})`);
    }
    onClose();
  };

  return (
    <div className="import-dialog" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-dialog__panel" role="dialog" aria-modal="true" aria-label="Import cookies">
        <header className="import-dialog__header">
          <h2 className="import-dialog__title">Import cookies</h2>
          <button type="button" className="import-dialog__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        {!parsed && (
          <div
            className={`import-dialog__dropzone${dragOver ? ' import-dialog__dropzone--over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <p className="import-dialog__drop-text">
              Drop a JSON or CSV export here (EditThisCookie files work too), or
            </p>
            <button type="button" className="import-dialog__browse" onClick={() => fileInput.current?.click()}>
              Choose a file…
            </button>
            <input
              ref={fileInput}
              className="import-dialog__file"
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </div>
        )}

        {parsed && (
          <div className="import-dialog__preview">
            <p className="import-dialog__summary">
              <strong>{fileName}</strong>: {parsed.drafts.length} cookie
              {parsed.drafts.length === 1 ? '' : 's'} ready to import
              {parsed.errors.length > 0 && `, ${parsed.errors.length} invalid`}
            </p>
            {parsed.errors.length > 0 && (
              <ul className="import-dialog__errors">
                {parsed.errors.slice(0, 5).map((error) => (
                  <li key={`${error.index}-${error.reason}`}>
                    {error.index >= 0 ? `Entry ${error.index + 1}: ` : ''}
                    {error.reason}
                  </li>
                ))}
                {parsed.errors.length > 5 && <li>…and {parsed.errors.length - 5} more</li>}
              </ul>
            )}
            <div className="import-dialog__actions">
              <button type="button" className="import-dialog__back" onClick={() => setParsed(null)}>
                Pick another file
              </button>
              <button
                type="button"
                className="import-dialog__apply"
                disabled={parsed.drafts.length === 0 || applying}
                onClick={() => void apply()}
              >
                {applying
                  ? 'Importing…'
                  : `Import ${parsed.drafts.length} cookie${parsed.drafts.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
