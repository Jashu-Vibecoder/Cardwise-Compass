import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { TransactionForm } from '../components/TransactionForm';
import { CsvImportDialog } from '../components/CsvImportDialog';
import { useToast } from '../lib/use-toast';
import { formatCurrency, shortDate } from '../lib/format';
import { exportTransactionsCsv } from '../lib/csv';
import { removeTransaction, saveTransaction, saveTransactions } from '../lib/data';
import type { Transaction, TransactionInput, TransactionType } from '../domain/types';
import { monthKey } from '../domain/finance';
import { transactionInSelectedScope } from '../domain/transaction-filter';
import { scheduleObjectUrlRevocation } from '../lib/download';

const types: Array<{ value: 'all' | TransactionType; label: string }> = [
  { value: 'all', label: 'All activity' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }, { value: 'refund', label: 'Refunds' }, { value: 'transfer', label: 'Transfers' },
];

function sourceLabel(source: Transaction['source']) {
  return ({ manual: 'Manual', csv_import: 'Import', android_alert: 'Android alert', bank_provider: 'Bank sync', demo: 'Demo' })[source];
}

export function TransactionsPage() {
  const { data, month, refresh, setBusy, busy, readOnly } = useApp();
  const timezone = data.profile.timezone;
  const currency = data.profile.preferred_currency;
  const money = (minor: number) => formatCurrency(minor, currency);
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [allMonths, setAllMonths] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => [...data.transactions]
    .filter((row) => row.currency === currency)
    .filter((row) => transactionInSelectedScope(monthKey(row.occurred_at, timezone), month, allMonths))
    .filter((row) => type === 'all' || row.transaction_type === type)
    .filter((row) => categoryId === 'all' || row.category_id === categoryId)
    .filter((row) => !search || `${row.merchant} ${row.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)), [data.transactions, month, type, categoryId, search, timezone, currency, allMonths]);

  async function save(value: TransactionInput) {
    setBusy(true);
    try {
      await saveTransaction(value, transaction?.id);
      await refresh();
      setFormOpen(false);
      setTransaction(null);
      notify(transaction ? 'Transaction updated.' : 'Transaction added.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transaction could not be saved.', 'error');
    } finally { setBusy(false); }
  }

  async function remove(row: Transaction) {
    if (!window.confirm(`Delete the ${row.transaction_type} from ${row.merchant}?`)) return;
    setBusy(true);
    try {
      await removeTransaction(row.id);
      await refresh();
      notify('Transaction deleted.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transaction could not be deleted.', 'error');
    } finally { setBusy(false); }
  }

  async function importRows(rows: TransactionInput[]) {
    setBusy(true);
    try {
      const result = await saveTransactions(rows);
      await refresh();
      setImportOpen(false);
      notify(`${result.imported} transaction${result.imported === 1 ? '' : 's'} imported${result.failed ? `; ${result.failed} could not be imported` : ''}.`, result.failed ? 'error' : 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Some transactions could not be imported.', 'error');
    } finally { setBusy(false); }
  }

  function exportCsv() {
    const content = exportTransactionsCsv(filtered, data);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cardwise-transactions-${month}.csv`;
    anchor.click();
    scheduleObjectUrlRevocation(url);
    notify('Your filtered transactions are ready to save.');
  }

  function openCreate() { setTransaction(null); setFormOpen(true); }
  function openEdit(row: Transaction) { setTransaction(row); setFormOpen(true); }

  return (
    <div className="page-content" data-read-only={readOnly}>
      <PageHeader eyebrow="YOUR ACTIVITY" title="Transactions" description="A clear, searchable record of your spending and income." action={<div className="header-button-group"><button className="button button--quiet" onClick={() => setImportOpen(true)}><ArrowDownToLine size={16} /> Import CSV</button><button className="button button--primary" onClick={openCreate}><Plus size={17} /> Add transaction</button></div>} />
      <section className="panel transaction-panel">
        <div className="transaction-toolbar">
          <div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchants or notes" aria-label="Search transactions" /></div>
          <label className="check-field transaction-all-months"><input type="checkbox" checked={allMonths} onChange={(event) => setAllMonths(event.target.checked)} /><span>Search all months</span></label>
          <label className="filter-select"><span className="sr-only">Transaction type</span><select value={type} onChange={(event) => setType(event.target.value as typeof type)}>{types.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><ChevronDown size={14} /></label>
          <label className="filter-select"><span className="sr-only">Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">All categories</option>{data.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><ChevronDown size={14} /></label>
          <span className="transaction-month"><CalendarDays size={15} />{filtered.length} records</span>
        </div>
        {filtered.length ? <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>Transaction</th><th>Category</th><th>Card</th><th>Date</th><th>Source</th><th className="align-right">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {filtered.map((row) => {
            const category = data.categories.find((item) => item.id === row.category_id);
            const card = data.cards.find((item) => item.id === row.card_id);
            const tone = row.transaction_type === 'income' || row.transaction_type === 'refund' ? 'transaction-value--positive' : row.transaction_type === 'transfer' ? 'transaction-value--neutral' : '';
            const sign = row.transaction_type === 'income' || row.transaction_type === 'refund' ? '+' : row.transaction_type === 'transfer' ? '' : '−';
            return <tr key={row.id}><td><div className="table-merchant"><div className="transaction-icon" style={{ '--category-color': category?.color ?? '#9aa5b5' } as React.CSSProperties}><span>{category?.name.slice(0, 1) ?? '·'}</span></div><div><strong>{row.merchant}</strong><span>{row.description || row.transaction_type}</span></div></div></td><td><span className="category-chip"><i style={{ background: category?.color ?? '#9aa5b5' }} />{category?.name ?? 'Uncategorized'}</span></td><td>{card ? <span className="table-card-name">{card.catalog.card_name}</span> : <span className="muted-dash">—</span>}</td><td>{shortDate(row.occurred_at, timezone)}</td><td><span className={`source-badge ${row.source === 'demo' ? 'source-badge--demo' : ''}`}>{sourceLabel(row.source)}</span></td><td className={`align-right transaction-value ${tone}`}>{sign}{money(row.amount_minor)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${row.merchant}`} title="Edit transaction" onClick={() => openEdit(row)}><Pencil size={15} /></button><button className="icon-button icon-button--danger" aria-label={`Delete ${row.merchant}`} title="Delete transaction" onClick={() => void remove(row)}><Trash2 size={15} /></button></div></td></tr>;
          })}
        </tbody></table></div> : <div className="empty-state"><div className="empty-illustration"><ArrowUpFromLine size={24} /></div><h3>{allMonths ? 'No transactions match these filters' : data.transactions.some((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === month) ? 'No transactions match these filters' : 'No transactions this month'}</h3><p>{allMonths || data.transactions.some((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === month) ? 'Try another search or clear a filter.' : 'Add an expense, income, refund, or transfer to get started.'}</p>{!allMonths && !data.transactions.some((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === month) && <button className="button button--primary" onClick={openCreate}><Plus size={16} /> Add transaction</button>}</div>}
        {filtered.length > 0 && <div className="table-footer"><span>{allMonths ? `Showing ${filtered.length} matching records across all months` : `Showing ${filtered.length} of ${data.transactions.filter((row) => row.currency === currency && monthKey(row.occurred_at, timezone) === month).length} records for ${month}`}</span><button className="text-link" onClick={exportCsv}>Export filtered CSV <ArrowUpFromLine size={14} /></button></div>}
      </section>
      {formOpen && <Modal title={transaction ? 'Edit transaction' : 'Add a transaction'} description="Keep your monthly totals accurate with a quick record." onClose={() => { setFormOpen(false); setTransaction(null); }}><TransactionForm initial={transaction ?? undefined} onSubmit={save} onCancel={() => { setFormOpen(false); setTransaction(null); }} busy={busy} /></Modal>}
      {importOpen && <CsvImportDialog onClose={() => setImportOpen(false)} onImport={importRows} busy={busy} />}
    </div>
  );
}
