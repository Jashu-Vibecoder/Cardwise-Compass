import { useState } from 'react';
import { ArrowUpFromLine, FileDown, LockKeyhole, MapPin, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/use-toast';
import { deleteMyAccount, deleteMyFinancialData, isPreviewMode, saveProfile } from '../lib/data';
import { exportTransactionsCsv } from '../lib/csv';
import { scheduleObjectUrlRevocation } from '../lib/download';
import { currencySymbol, parseINRAmount } from '../lib/format';

export function ProfilePage() {
  const { data, refresh, setBusy, busy, readOnly, isDemo } = useApp();
  const { notify } = useToast();
  const [name, setName] = useState(data.profile.display_name);
  const [city, setCity] = useState(data.profile.city ?? '');
  const [occupation, setOccupation] = useState(data.profile.occupation ?? '');
  const [income, setIncome] = useState(data.profile.monthly_income_minor == null ? '' : (data.profile.monthly_income_minor / 100).toFixed(2));
  const [removeOpen, setRemoveOpen] = useState(false);
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [error, setError] = useState('');

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    if (!name.trim()) { setError('Display name is required.'); return; }
    const incomeMinor = income.trim() ? parseINRAmount(income) : null;
    if (income.trim() && incomeMinor === null) { setError('Monthly income must be a positive amount, or leave it blank.'); return; }
    setError('');
    setBusy(true);
    try {
      await saveProfile({ display_name: name.trim(), city: city.trim() || null, occupation: occupation.trim() || null, monthly_income_minor: incomeMinor });
      await refresh();
      notify('Profile saved.');
    } catch (issue) { notify(issue instanceof Error ? issue.message : 'Profile could not be saved.', 'error'); }
    finally { setBusy(false); }
  }

  function exportData() {
    const csv = exportTransactionsCsv(data.transactions, data);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cardwise-my-transactions.csv';
    anchor.click();
    scheduleObjectUrlRevocation(url);
    notify('Your transaction export is ready.');
  }

  async function deleteRecords() {
    setBusy(true);
    try {
      await deleteMyFinancialData();
      await refresh();
      setRemoveOpen(false);
      notify('Your saved transactions, budgets, and cards were removed.');
    } catch (issue) { notify(issue instanceof Error ? issue.message : 'Your records could not be deleted.', 'error'); }
    finally { setBusy(false); }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await deleteMyAccount();
      setAccountDeleteOpen(false);
      notify('Your account and its financial records were deleted.');
    } catch (issue) { notify(issue instanceof Error ? issue.message : 'Your account could not be deleted.', 'error'); }
    finally { setBusy(false); }
  }

  return <div className="page-content" data-read-only={readOnly}>
    <PageHeader eyebrow="YOUR DETAILS" title="Profile & settings" description="Keep the context behind your spending picture up to date." />
    <div className="profile-layout">
      <section className="panel profile-form-panel"><div className="panel-header"><div><div className="panel-title">Personal profile</div><div className="panel-subtitle">Optional details add helpful context to your budget views.</div></div><span className="profile-icon"><UserRound size={18} /></span></div>
        <form className="form-stack profile-form" onSubmit={(event) => void save(event)}>
          <label className="field"><span>Display name <i>*</i></span><input disabled={readOnly} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
          <div className="form-grid form-grid--two"><label className="field"><span>City <small>Optional</small></span><div className="field-with-icon"><MapPin size={16} /><input disabled={readOnly} value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Bengaluru" maxLength={100} /></div></label><label className="field"><span>Occupation <small>Optional</small></span><input disabled={readOnly} value={occupation} onChange={(event) => setOccupation(event.target.value)} placeholder="e.g. Product designer" maxLength={100} /></label></div>
          <label className="field"><span>Monthly income <small>Optional · {data.profile.preferred_currency}</small></span><div className="money-input"><span>{currencySymbol(data.profile.preferred_currency)}</span><input disabled={readOnly} inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} placeholder="Add if it helps your planning" /></div><small>Income is used only to contextualize recorded cash flow and budget views.</small></label>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="profile-form-footer"><span><ShieldCheck size={14} />{readOnly ? 'Fictional demo profile · read-only' : 'Only you can see your profile.'}</span>{!readOnly && <button className="button button--primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save profile'}</button>}</div>
        </form>
      </section>
      <aside className="profile-side-column">
        <section className="panel profile-info-panel"><span className="profile-side-icon"><LockKeyhole size={18} /></span><h2>Private by design</h2><p>Cardwise stores card nicknames, issuer, type, and optional last four digits. It never asks for your PIN, CVV, full card number, or bank password.</p><div className="profile-security-line"><ShieldCheck size={15} />{isDemo ? 'Demo edits stay in this browser and are separate from user accounts.' : 'Each financial record belongs to your signed-in account.'}</div></section>
        <section className="panel data-tools-panel"><div className="panel-title">Your data</div><div className="data-tool-row"><div><strong>Export transactions</strong><span>Download your saved records as CSV.</span></div><button className="icon-button" onClick={exportData} aria-label="Export transactions"><FileDown size={17} /></button></div><div className="data-tool-row data-tool-row--danger"><div><strong>{isPreviewMode() ? 'Clear preview records' : 'Delete financial records'}</strong><span>Remove saved cards, budgets, and transactions.</span></div><button className="icon-button icon-button--danger" onClick={() => setRemoveOpen(true)} aria-label="Delete my financial records"><Trash2 size={17} /></button></div>{!isPreviewMode() && !isDemo && <div className="account-delete-link"><span>Want to leave Cardwise?</span><button className="text-button" onClick={() => setAccountDeleteOpen(true)}>Delete my account</button></div>}</section>
        <div className="profile-account-note"><span>Account</span><strong>{data.profile.preferred_currency} · {data.profile.timezone}</strong><small>Currency and month boundaries follow your current account settings.</small></div>
      </aside>
    </div>
    {removeOpen && <Modal title="Delete your financial records?" description="This removes your saved transactions, budgets, and wallet cards from this account." onClose={() => setRemoveOpen(false)}><div className="delete-confirm"><div className="delete-confirm-icon"><Trash2 size={22} /></div><p>This action cannot be undone. Your sign-in account and profile details remain available.</p><div className="modal-actions"><button className="button button--quiet" type="button" onClick={() => setRemoveOpen(false)}>Keep my records</button><button className="button button--danger" type="button" disabled={busy} onClick={() => void deleteRecords()}>{busy ? 'Deleting…' : 'Delete my records'}<ArrowUpFromLine size={15} /></button></div></div></Modal>}
    {accountDeleteOpen && <Modal title="Delete your Cardwise account?" description="Your sign-in account and all linked Cardwise records will be permanently removed." onClose={() => { setAccountDeleteOpen(false); setDeletePhrase(''); }}><div className="delete-confirm"><div className="delete-confirm-icon"><Trash2 size={22} /></div><p>This cannot be undone. Type <strong>DELETE</strong> to confirm. Your account is removed through a server-side function; no service key is sent to your browser.</p><label className="field account-delete-confirm-field"><span>Type DELETE to confirm</span><input autoFocus value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} autoComplete="off" /></label><div className="modal-actions"><button className="button button--quiet" type="button" onClick={() => { setAccountDeleteOpen(false); setDeletePhrase(''); }}>Keep my account</button><button className="button button--danger" type="button" disabled={busy || deletePhrase !== 'DELETE'} onClick={() => void deleteAccount()}>{busy ? 'Deleting…' : 'Delete account'}<Trash2 size={15} /></button></div></div></Modal>}
  </div>;
}
