import { type FormEvent, useEffect, useState } from 'react';
import { Check, Pencil, RotateCw, ShieldCheck, Trash2, UserPlus } from 'lucide-react';

type Account = { username: string; role: 'admin' | 'reader' };
type AccountsResponse = { users: Account[]; current_user: string };

async function accountRequest(action: string, token: string, body?: object, signal?: AbortSignal): Promise<AccountsResponse> {
  const response = await fetch(`./api.php?action=${action}`, {
    credentials: 'include', signal,
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let result: AccountsResponse & { error?: string };
  try { result = JSON.parse(text); }
  catch { throw new Error(response.status === 401 ? 'Autentique-se novamente para continuar.' : 'Não foi possível acessar o cadastro de usuários.'); }
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a alteração.');
  return result;
}

export default function UserAdministration({ csrfToken, currentUser, onBusyChange, onSaved }: {
  csrfToken: string; currentUser: string; onBusyChange: (busy: boolean) => void; onSaved: () => void;
}) {
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Account['role']>('reader');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const request = new AbortController();
    setLoading(true);
    setError('');
    void accountRequest('list_users', csrfToken, undefined, request.signal)
      .then((result) => setUsers(result.users))
      .catch((failure: unknown) => { if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar os usuários.'); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [csrfToken, reload]);

  const beginEditing = (account: Account | 'new') => {
    setEditing(account);
    setUsername(account === 'new' ? '' : account.username);
    setRole(account === 'new' ? 'reader' : account.role);
    setPassword(''); setConfirmation(''); setError(''); setNote(''); setDeleting(null);
  };

  const mutate = async (action: string, body: object, message: string) => {
    if (!csrfToken) { setError('A sessão expirou. Atualize a página.'); return; }
    setBusy(true); onBusyChange(true); setError(''); setNote('');
    try {
      const result = await accountRequest(action, csrfToken, body);
      setUsers(result.users); setEditing(null); setDeleting(null);
      setPassword(''); setConfirmation(''); setNote(message); onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); onBusyChange(false); }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    if (password && (new TextEncoder().encode(password).length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError('A senha deve ter de 8 a 72 bytes.'); return;
    }
    const ownPassword = username === currentUser && password !== '';
    void mutate('save_user', { username, role, password, create: editing === 'new' },
      ownPassword ? 'Senha alterada. Se o navegador pedir o acesso novamente, use a nova senha.' : editing === 'new' ? 'Usuário criado. Já pode acessar com a senha definida.' : 'Usuário atualizado. As permissões já estão em vigor.');
  };

  return (
    <div className="user-admin">
      <p className="user-admin-intro">Administradores podem editar a árvore e administrar usuários. Leitores podem consultar a árvore e o mapa.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {note && <p className="user-admin-note" role="status"><Check size={15} />{note}</p>}
      {editing ? (
        <form onSubmit={save}>
          <h3>{editing === 'new' ? 'Novo usuário' : `Editar ${editing.username}`}</h3>
          <div className="form-grid">
            <div className="field"><label htmlFor="account-username">Usuário *</label><input id="account-username" value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_.\-]{0,63}" autoComplete="off" readOnly={editing !== 'new'} disabled={busy} /></div>
            <div className="field"><label htmlFor="account-role">Perfil *</label><select id="account-role" value={role} onChange={(event) => setRole(event.target.value as Account['role'])} disabled={busy || username === currentUser}><option value="reader">Leitor</option><option value="admin">Administrador</option></select></div>
            <div className="field"><label htmlFor="account-password">{editing === 'new' ? 'Senha *' : 'Nova senha'}</label><input id="account-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required={editing === 'new'} minLength={8} maxLength={72} disabled={busy} /></div>
            <div className="field"><label htmlFor="account-confirmation">Confirmar senha{editing === 'new' || password ? ' *' : ''}</label><input id="account-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required={editing === 'new' || password !== ''} minLength={8} maxLength={72} disabled={busy} /></div>
          </div>
          <p className="form-note">{editing === 'new' ? 'Use letras sem acentos, números, ponto, hífen ou sublinhado no usuário. A senha precisa ter pelo menos 8 caracteres.' : 'Deixe os campos de senha vazios para manter a senha atual.'}</p>
          {username === currentUser && <p className="form-note">Seu perfil de administrador será mantido. Ao alterar sua senha, o navegador poderá pedir o acesso novamente.</p>}
          <div className="modal-actions"><button type="button" className="button" disabled={busy} onClick={() => { setEditing(null); setError(''); setPassword(''); setConfirmation(''); }}>Voltar</button><button className="button primary" disabled={busy}><Check size={15} />{busy ? 'Salvando…' : editing === 'new' ? 'Criar usuário' : 'Salvar usuário'}</button></div>
        </form>
      ) : (
        <>
          <div className="user-admin-toolbar"><span>{loading ? 'Carregando usuários…' : `${users.length} usuário${users.length === 1 ? '' : 's'}`}</span><button type="button" className="button small primary" disabled={busy || loading || users.length === 0} onClick={() => beginEditing('new')}><UserPlus size={15} />Novo usuário</button></div>
          <ul className="user-admin-list" aria-label="Usuários cadastrados">
            {users.map((account) => (
              <li key={account.username}>
                <div className="user-admin-account"><strong>{account.username}{account.username === currentUser && <small>Você</small>}</strong><span>{account.role === 'admin' && <ShieldCheck size={12} />}{account.role === 'admin' ? 'Administrador' : 'Leitor'}</span></div>
                <button type="button" className="icon-button" disabled={busy} aria-label={`Editar usuário ${account.username}`} title="Editar usuário" onClick={() => beginEditing(account)}><Pencil size={14} /></button>
                {account.username !== currentUser && <button type="button" className="icon-button" disabled={busy} aria-label={`Excluir usuário ${account.username}`} title="Excluir usuário" onClick={() => { setDeleting(account.username); setError(''); setNote(''); }}><Trash2 size={14} /></button>}
              </li>
            ))}
          </ul>
          {!loading && users.length === 0 && <button type="button" className="button" onClick={() => setReload((value) => value + 1)}><RotateCw size={15} />Tentar novamente</button>}
          {deleting && <div className="user-admin-delete" role="alert"><p>Excluir o acesso de <strong>{deleting}</strong>? Os dados da família serão mantidos.</p><div className="modal-actions"><button type="button" className="button" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className="button danger" disabled={busy} onClick={() => void mutate('delete_user', { username: deleting }, 'Usuário excluído.')}><Trash2 size={15} />{busy ? 'Excluindo…' : 'Confirmar exclusão'}</button></div></div>}
        </>
      )}
    </div>
  );
}
