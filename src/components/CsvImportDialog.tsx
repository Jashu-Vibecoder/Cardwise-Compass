import { useRef, useState } from 'react';
import { FileUp, ShieldCheck, Upload } from 'lucide-react';
import type { CsvPreviewRow } from '../lib/csv';
import { detectCsvDelimiter, previewTransactionCsv } from '../lib/csv';
import type { TransactionInput } from '../domain/types';
import { formatCurrency } from '../lib/format';
import { useApp } from '../lib/app-context';
import { Modal } from './Modal';
import { dateOnly } from '../domain/dates';

export function CsvImportDialog({ onClose, onImport, busy }: { onClose: () => void; onImport: (rows: TransactionInput[]) => Promise<void>; busy: boolean }) {
  const { data } = useApp();
  const money = (minor: number) => formatCurrency(minor, data.profile.preferred_currency);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvPreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [error, setError] = useState('');
  const [includeDuplicates, setIncludeDuplicates] = useState(false);

  async function chooseFile(file?: File) {
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const text = await file.text();
      setDelimiter(detectCsvDelimiter(text));
      const preview = previewTransactionCsv(text, data.categories, data.transactions, data.profile.timezone, data.profile.preferred_currency);
      setRows(preview);
      if (preview.length === 0) setError('This CSV has a header row but no transactions.');
    } catch (issue) {
      setRows([]);
      setError(issue instanceof Error ? issue.message : 'This file could not be read as a transaction CSV.');
    }
  }

  const validRows = rows.filter((row) => row.input && row.errors.length === 0 && (!row.duplicateOf || includeDuplicates));
  const duplicateCount = rows.filter((row) => row.duplicateOf).length;
  const invalidCount = rows.filter((row) => row.errors.length > 0).length;

  return (
    <Modal title="Import transactions" description="Review rows before they are added to your account." onClose={onClose} size="wide">
      <div className="csv-import-body">
        <button className="csv-dropzone" type="button" onClick={() => fileRef.current?.click()}>
          <span className="csv-drop-icon"><FileUp size={21} /></span><strong>{fileName || 'Choose a CSV file'}</strong><span>Use date, amount, merchant, type, category, and description columns.</span><span className="button button--quiet button--small"><Upload size={14} /> Browse files</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => void chooseFile(event.target.files?.[0])} />
        <div className="csv-privacy-note"><ShieldCheck size={15} />Rows are validated in your browser. No raw file is retained.</div>
        {fileName && <p className="csv-note">Detected delimiter: {delimiter === '\t' ? 'tab' : delimiter === ';' ? 'semicolon' : 'comma'}.</p>}
        {error && <div className="inline-error" role="alert">{error}</div>}
        {rows.length > 0 && <>
          <div className="csv-summary"><span><strong>{validRows.length}</strong> ready</span><span className="tone-warning"><strong>{duplicateCount}</strong> possible duplicates</span><span className="tone-negative"><strong>{invalidCount}</strong> need fixing</span></div>
          {duplicateCount > 0 && <label className="check-field csv-duplicate-confirm"><input type="checkbox" checked={includeDuplicates} onChange={(event) => setIncludeDuplicates(event.target.checked)} /><span><strong>Include possible duplicates</strong><small>I checked these rows and want to import them anyway.</small></span></label>}
          <div className="csv-preview-table"><div className="csv-preview-head"><span>Row</span><span>Merchant</span><span>Date</span><span>Amount</span><span>Status</span></div>
            {rows.slice(0, 8).map((row) => <div className="csv-preview-row" key={row.rowNumber}><span>#{row.rowNumber}</span><span>{row.input?.merchant ?? '—'}</span><span>{row.input ? dateOnly(row.input.occurred_at, data.profile.timezone) : '—'}</span><span>{row.input ? money(row.input.amount_minor) : '—'}</span><span className={row.errors.length ? 'tone-negative' : row.duplicateOf ? 'tone-warning' : 'tone-positive'}>{row.errors.length ? 'Invalid' : row.duplicateOf ? 'Duplicate' : 'Ready'}</span></div>)}
          </div>
          {(duplicateCount > 0 || invalidCount > 0) && <p className="csv-note">Possible duplicates and invalid rows are skipped. {rows.length > 8 ? `${rows.length - 8} more rows are not shown.` : ''}</p>}
        </>}
        <div className="modal-actions"><button className="button button--quiet" type="button" onClick={onClose}>Cancel</button><button className="button button--primary" type="button" disabled={busy || validRows.length === 0} onClick={() => void onImport(validRows.map((row) => row.input!))}>{busy ? 'Importing…' : `Import ${validRows.length || ''} transaction${validRows.length === 1 ? '' : 's'}`}</button></div>
      </div>
    </Modal>
  );
}
