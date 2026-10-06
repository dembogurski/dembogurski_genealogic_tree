import { type CSSProperties, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Camera, Check, ChevronRight, CircleHelp, Clock3, Download,
  Flower2, GitBranch, Heart, Leaf, Link2, Map as MapIcon, MapPin, Pencil, Plus, Printer, RotateCw,
  Search, TreeDeciduous, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import FamilyMap from './FamilyMap';

export type Person = {
  id: number;
  nome: string;
  sobrenome: string;
  sexo: string | null;
  ramo: number;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  observacoes: string | null;
  pai_id: number | null;
  mae_id: number | null;
  conjuge_atual_id: number | null;
  foto_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type TreeResponse = { people: Person[]; can_edit?: boolean; csrf_token?: string };
type FormKind = 'child' | 'spouse' | 'photo' | 'location' | 'edit' | 'delete';
type BranchInfo = { id: number; title: string; phrase: string; icon: typeof Leaf };

const branchInfo: BranchInfo[] = [
  { id: 1, title: 'Miguel', phrase: 'Novos nomes, novas histórias.', icon: Leaf },
  { id: 2, title: 'Pedro', phrase: 'Memórias que nos conectam.', icon: Flower2 },
  { id: 3, title: 'João', phrase: 'Histórias que seguem adiante.', icon: GitBranch },
  { id: 4, title: 'Maria', phrase: 'Laços que atravessam gerações.', icon: Heart },
  { id: 5, title: 'Júlia', phrase: 'Novos caminhos, a mesma raiz.', icon: Users },
];

const personCardWidth = 224;
const siblingGap = 18;
const branchHeadWidth = 270;

const demoPeople = [
  { id: 1, nome: 'Matias', sobrenome: 'Dembogurski', sexo: 'Masculino', ramo: 0, data_nascimento: null, data_falecimento: null, cidade: null, observacoes: null, pai_id: null, mae_id: null, conjuge_atual_id: 2, foto_url: null },
  { id: 2, nome: 'Sophia', sobrenome: 'Dembogurski', sexo: 'Feminino', ramo: 0, data_nascimento: null, data_falecimento: null, cidade: null, observacoes: null, pai_id: null, mae_id: null, conjuge_atual_id: 1, foto_url: null },
  { id: 3, nome: 'Miguel', sobrenome: 'Dembogurski', sexo: 'Masculino', ramo: 1, data_nascimento: null, data_falecimento: null, cidade: 'Curitiba, PR', observacoes: null, pai_id: 1, mae_id: 2, conjuge_atual_id: 8, foto_url: null },
  { id: 4, nome: 'Pedro', sobrenome: 'Dembogurski', sexo: 'Masculino', ramo: 2, data_nascimento: null, data_falecimento: null, cidade: 'Ponta Grossa, PR', observacoes: null, pai_id: 1, mae_id: 2, conjuge_atual_id: 9, foto_url: null },
  { id: 5, nome: 'João', sobrenome: 'Dembogurski', sexo: 'Masculino', ramo: 3, data_nascimento: null, data_falecimento: null, cidade: 'São Paulo, SP', observacoes: null, pai_id: 1, mae_id: 2, conjuge_atual_id: 10, foto_url: null },
  { id: 6, nome: 'Maria', sobrenome: 'Dembogurski', sexo: 'Feminino', ramo: 4, data_nascimento: null, data_falecimento: null, cidade: 'Porto Alegre, RS', observacoes: null, pai_id: 1, mae_id: 2, conjuge_atual_id: null, foto_url: null },
  { id: 7, nome: 'Júlia', sobrenome: 'Dembogurski', sexo: 'Feminino', ramo: 5, data_nascimento: null, data_falecimento: null, cidade: 'Florianópolis, SC', observacoes: null, pai_id: 1, mae_id: 2, conjuge_atual_id: null, foto_url: null },
  { id: 8, nome: 'Helena', sobrenome: 'Almeida', sexo: 'Feminino', ramo: 1, data_nascimento: null, data_falecimento: null, cidade: 'Curitiba, PR', observacoes: null, pai_id: null, mae_id: null, conjuge_atual_id: 3, foto_url: null },
  { id: 9, nome: 'Antônio', sobrenome: 'Kowalski', sexo: 'Masculino', ramo: 2, data_nascimento: null, data_falecimento: null, cidade: null, observacoes: null, pai_id: null, mae_id: null, conjuge_atual_id: 4, foto_url: null },
  { id: 10, nome: 'Lígia', sobrenome: 'Martins', sexo: 'Feminino', ramo: 3, data_nascimento: null, data_falecimento: null, cidade: null, observacoes: null, pai_id: null, mae_id: null, conjuge_atual_id: 5, foto_url: null },
  { id: 11, nome: 'Ana', sobrenome: 'Dembogurski', sexo: 'Feminino', ramo: 1, data_nascimento: null, data_falecimento: null, cidade: null, observacoes: null, pai_id: 3, mae_id: 8, conjuge_atual_id: null, foto_url: null },
  { id: 12, nome: 'Rafael', sobrenome: 'Dembogurski', sexo: 'Masculino', ramo: 2, data_nascimento: null, data_falecimento: null, cidade: 'Curitiba, PR', observacoes: null, pai_id: 4, mae_id: 9, conjuge_atual_id: null, foto_url: null },
].map((person, index) => ({
  ...person,
  latitude: ({ 3: -25.4284, 4: -25.095, 5: -23.5505, 6: -30.0346, 7: -27.5949 } as Record<number, number>)[index + 1] ?? null,
  longitude: ({ 3: -49.2733, 4: -50.1619, 5: -46.6333, 6: -51.2177, 7: -48.5482 } as Record<number, number>)[index + 1] ?? null,
})) satisfies Person[];

const isDemo = import.meta.env.DEV;
const storageKey = 'dembogurski-family-tree-v1';
const fullName = (person: Person) => `${person.nome} ${person.sobrenome}`.trim();

function familySubtreeIds(people: Person[], personId: number): Set<number> {
  const childrenByParent = new Map<number, number[]>();
  for (const person of people) {
    for (const parentId of [person.pai_id, person.mae_id]) {
      if (parentId === null) continue;
      const children = childrenByParent.get(parentId) ?? [];
      children.push(person.id);
      childrenByParent.set(parentId, children);
    }
  }

  const ids = new Set([personId]);
  const pending = [personId];
  while (pending.length) {
    const parentId = pending.pop()!;
    for (const childId of childrenByParent.get(parentId) ?? []) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      pending.push(childId);
    }
  }
  return ids;
}

function localTree(): TreeResponse {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const snapshot = JSON.parse(saved) as TreeResponse;
      return { people: Array.isArray(snapshot.people) ? snapshot.people.map((person) => ({ ...person, latitude: person.latitude ?? null, longitude: person.longitude ?? null })) : [] };
    }
  } catch {
    // An invalid local preview snapshot is reset to the supplied example.
  }
  return { people: demoPeople };
}

async function getTree(): Promise<TreeResponse> {
  if (isDemo) return { ...localTree(), can_edit: true, csrf_token: 'local-preview-token' };
  const response = await fetch('./api.php?action=get_tree', { credentials: 'include' });
  if (!response.ok) throw new Error(await responseError(response));
  return response.json() as Promise<TreeResponse>;
}

async function responseError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string };
    return parsed.error || parsed.message || `Erro ${response.status}: ${response.statusText}`;
  } catch {
    if (response.status === 401) return 'Autentique-se para acessar a árvore da família.';
    if (response.status === 403) return 'Seu acesso não permite realizar esta alteração.';
    return `Não foi possível concluir a solicitação (erro ${response.status}).`;
  }
}

function csrfHeaders(token: string): Record<string, string> {
  if (!token) throw new Error('A sessão expirou. Atualize a árvore e tente novamente.');
  return { 'X-CSRF-Token': token };
}

function persistLocal(people: Person[]) {
  localStorage.setItem(storageKey, JSON.stringify({ people }));
}

function PersonAvatar({ person, branchId, large = false }: { person: Person; branchId: number; large?: boolean }) {
  return (
    <span className={large ? 'detail-avatar' : 'person-avatar'} data-branch={branchId}>
      {person.foto_url ? <img src={person.foto_url} alt="" /> : person.nome.slice(0, 1).toLocaleUpperCase('pt-BR')}
    </span>
  );
}

function Modal({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-head">
          <div><div className="modal-kicker">{kicker}</div><h2 id="modal-title">{title}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={17} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [canEdit, setCanEdit] = useState(isDemo);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<number | null>(() => {
    const value = Number(new URLSearchParams(window.location.search).get('rama'));
    return value >= 1 && value <= 5 ? value : null;
  });
  const [showSpouses, setShowSpouses] = useState(true);
  const [view, setView] = useState<'tree' | 'map'>('tree');
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [formError, setFormError] = useState('');
  const [successNote, setSuccessNote] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const treeStageRef = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const tree = await getTree();
      setPeople(Array.isArray(tree.people) ? tree.people.map((person) => ({ ...person, latitude: person.latitude ?? null, longitude: person.longitude ?? null })) : []);
      setCanEdit(isDemo || tree.can_edit === true);
      setCsrfToken(tree.csrf_token || '');
      setLoadError('');
    } catch (error) {
      setPeople([]);
      setCanEdit(false);
      setCsrfToken('');
      setActivePerson(null);
      setFormKind(null);
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar a árvore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh, refreshTick]);
  useEffect(() => {
    if (!canEdit) setFormKind(null);
  }, [canEdit]);
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(false); }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    const onPop = () => {
      const value = Number(new URLSearchParams(window.location.search).get('rama'));
      setSelectedBranch(value >= 1 && value <= 5 ? value : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const personMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const removalIds = useMemo(
    () => activePerson ? familySubtreeIds(people, activePerson.id) : new Set<number>(),
    [people, activePerson],
  );
  const filteredBranches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return branchInfo.filter((branch) => selectedBranch === null || selectedBranch === branch.id).map((branch) => {
      const members = people.filter((person) => person.ramo === branch.id);
      const headPerson = members.find((person) => person.pai_id === 1 || person.mae_id === 2) ?? null;
      const roots = members.filter((person) => {
        const father = person.pai_id ? personMap.get(person.pai_id) : null;
        const mother = person.mae_id ? personMap.get(person.mae_id) : null;
        const reciprocalSpouse = person.conjuge_atual_id && personMap.get(person.conjuge_atual_id)?.conjuge_atual_id === person.id;
        return father?.id === 1 || mother?.id === 2 || ((!person.pai_id && !person.mae_id) && !reciprocalSpouse && !members.some((other) => other.pai_id === person.id || other.mae_id === person.id));
      });
      const matches = (person: Person): boolean => {
        if (!term) return true;
        if (fullName(person).toLocaleLowerCase('pt-BR').includes(term)) return true;
        return members.some((candidate) => {
          if (candidate.id === person.id) return false;
          let cursor: Person | undefined = candidate;
          const seen = new Set<number>();
          while (cursor && !seen.has(cursor.id)) {
            if (seen.has(cursor.id)) break;
            seen.add(cursor.id);
            if (cursor.pai_id === person.id || cursor.mae_id === person.id) return fullName(candidate).toLocaleLowerCase('pt-BR').includes(term);
            cursor = cursor.pai_id ? personMap.get(cursor.pai_id) : cursor.mae_id ? personMap.get(cursor.mae_id) : undefined;
          }
          return false;
        });
      };
      return {
        ...branch,
        headPerson,
        headMatches: headPerson ? matches(headPerson) : false,
        roots: roots.filter(matches).filter((person) => person.id !== headPerson?.id),
        total: members.filter((person) => !person.conjuge_atual_id || personMap.get(person.conjuge_atual_id)?.conjuge_atual_id !== person.id).length,
      };
    });
  }, [people, personMap, query, selectedBranch]);

  const setBranch = (branchId: number | null) => {
    setSelectedBranch(branchId);
    const url = new URL(window.location.href);
    if (branchId) url.searchParams.set('rama', String(branchId));
    else url.searchParams.delete('rama');
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const openActions = (person: Person) => { setActivePerson(person); setFormKind(null); setFormError(''); };
  const closeModal = () => { setActivePerson(null); setFormKind(null); setFormError(''); };
  const matchingPersonOrDescendant = (person: Person, seen = new Set<number>()): boolean => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return true;
    if (fullName(person).toLocaleLowerCase('pt-BR').includes(term)) return true;
    if (seen.has(person.id)) return false;
    const nextSeen = new Set(seen).add(person.id);
    return people.some((child) => (child.pai_id === person.id || child.mae_id === person.id) && matchingPersonOrDescendant(child, nextSeen));
  };
  const visibleDescendants = (person: Person) => people
    .filter((candidate) => candidate.pai_id === person.id || candidate.mae_id === person.id)
    .filter((candidate) => matchingPersonOrDescendant(candidate));
  const treeWidths = useMemo(() => {
    const widths = new Map<number, number>();
    const measure = (person: Person, visiting = new Set<number>()): number => {
      if (visiting.has(person.id)) return personCardWidth;
      const cached = widths.get(person.id);
      if (cached !== undefined) return cached;
      const nextVisiting = new Set(visiting).add(person.id);
      const children = people
        .filter((candidate) => candidate.pai_id === person.id || candidate.mae_id === person.id)
        .filter((candidate) => matchingPersonOrDescendant(candidate));
      const childrenWidth = children.reduce((total, child) => total + measure(child, nextVisiting), 0)
        + Math.max(0, children.length - 1) * siblingGap;
      const width = Math.max(personCardWidth, childrenWidth);
      widths.set(person.id, width);
      return width;
    };
    people.forEach((person) => measure(person));
    return widths;
  }, [people, personMap, query]);
  const generationStyle = (generation: Person[], minimumWidth = personCardWidth): CSSProperties => {
    const widths = generation.map((person) => treeWidths.get(person.id) ?? personCardWidth);
    const contentWidth = widths.reduce((total, width) => total + width, 0)
      + Math.max(0, widths.length - 1) * siblingGap;
    const rowWidth = Math.max(minimumWidth, contentWidth);
    const sidePadding = (rowWidth - contentWidth) / 2;
    return {
      '--generation-width': `${rowWidth}px`,
      '--generation-line-start': `${sidePadding + (widths[0] ?? 0) / 2}px`,
      '--generation-line-end': `${sidePadding + (widths[widths.length - 1] ?? 0) / 2}px`,
    } as CSSProperties;
  };

  useEffect(() => {
    if (loading || loadError || view !== 'tree') return;
    const frame = window.requestAnimationFrame(() => {
      const stage = treeStageRef.current;
      if (stage && stage.scrollWidth > stage.clientWidth) {
        stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, loadError, view]);

  const savePerson = async (payload: Omit<Person, 'id'> & { relationship_type?: 'child' | 'spouse' }) => {
    if (!canEdit) throw new Error('Somente organizadores autorizados podem fazer alterações.');
    if (isDemo) {
      const current = localTree().people;
      const created: Person = { ...payload, id: Math.max(0, ...current.map((person) => person.id)) + 1 };
      const next = [...current, created];
      persistLocal(next);
      setPeople(next);
      return created;
    }
    const response = await fetch('./api.php?action=add_person', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders(csrfToken) },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await responseError(response));
    const created = await response.json() as Person;
    const normalized = { ...created, latitude: created.latitude ?? null, longitude: created.longitude ?? null };
    setPeople((current) => [...current, normalized]);
    return normalized;
  };

  const savePersonDetails = async (personId: number, updates: Pick<Person, 'nome' | 'sobrenome' | 'sexo' | 'data_nascimento' | 'data_falecimento' | 'cidade' | 'observacoes' | 'pai_id' | 'mae_id'>) => {
    if (!canEdit) throw new Error('Somente organizadores autorizados podem fazer alterações.');
    if (isDemo) {
      const next = localTree().people.map((person) => person.id === personId ? { ...person, ...updates } : person);
      persistLocal(next);
      setPeople(next);
      return next.find((person) => person.id === personId)!;
    }
    const response = await fetch('./api.php?action=update_person', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders(csrfToken) },
      body: JSON.stringify({ person_id: personId, ...updates }),
    });
    if (!response.ok) throw new Error(await responseError(response));
    const updated = await response.json() as Person;
    const normalized = { ...updated, latitude: updated.latitude ?? null, longitude: updated.longitude ?? null };
    setPeople((current) => current.map((person) => person.id === personId ? normalized : person));
    return normalized;
  };

  const saveLocation = async (personId: number, latitude: number, longitude: number) => {
    if (!canEdit) throw new Error('Somente organizadores autorizados podem fazer alterações.');
    if (isDemo) {
      const next = localTree().people.map((person) => person.id === personId ? { ...person, latitude, longitude } : person);
      persistLocal(next);
      setPeople(next);
      return;
    }
    const response = await fetch('./api.php?action=update_location', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders(csrfToken) },
      body: JSON.stringify({ person_id: personId, latitude, longitude }),
    });
    if (!response.ok) throw new Error(await responseError(response));
    const coordinates = await response.json() as { latitude: number; longitude: number };
    setPeople((current) => current.map((person) => person.id === personId ? { ...person, ...coordinates } : person));
  };

  const savePhoto = async (personId: number, file: File) => {
    if (!canEdit) throw new Error('Somente organizadores autorizados podem fazer alterações.');
    if (isDemo) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(file);
      });
      const next = localTree().people.map((person) => person.id === personId ? { ...person, foto_url: dataUrl } : person);
      persistLocal(next);
      setPeople(next);
      return dataUrl;
    }
    const data = new FormData();
    data.append('person_id', String(personId));
    data.append('photo', file);
    const response = await fetch('./api.php?action=upload_photo', {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(csrfToken),
      body: data,
    });
    if (!response.ok) throw new Error(await responseError(response));
    const result = await response.json() as { foto_url: string };
    setPeople((current) => current.map((person) => person.id === personId ? { ...person, foto_url: result.foto_url } : person));
    return result.foto_url;
  };

  const removePerson = async () => {
    if (!activePerson || !canEdit || busy) return;
    setFormError('');
    setBusy(true);
    try {
      let currentPeople = people;
      let removedIds: number[];
      if (isDemo) {
        currentPeople = localTree().people;
        if (!currentPeople.some((person) => person.id === activePerson.id)) {
          throw new Error('Essa pessoa não está mais na árvore. Atualize e tente novamente.');
        }
        removedIds = [...familySubtreeIds(currentPeople, activePerson.id)];
      } else {
        const response = await fetch('./api.php?action=delete_person', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders(csrfToken) },
          body: JSON.stringify({
            person_id: activePerson.id,
            expected_descendant_ids: [...removalIds].sort((left, right) => left - right),
          }),
        });
        if (!response.ok) throw new Error(await responseError(response));
        const result = await response.json() as { deleted_ids?: unknown };
        if (!Array.isArray(result.deleted_ids) || !result.deleted_ids.every((id) => Number.isInteger(id) && id > 0)) {
          throw new Error('O servidor não confirmou a remoção. Atualize a árvore antes de continuar.');
        }
        removedIds = result.deleted_ids as number[];
      }

      const removed = new Set(removedIds);
      if (!removed.has(activePerson.id)) {
        throw new Error('O servidor não confirmou a remoção. Atualize a árvore antes de continuar.');
      }
      const next = currentPeople
        .filter((person) => !removed.has(person.id))
        .map((person) => person.conjuge_atual_id !== null && removed.has(person.conjuge_atual_id)
          ? { ...person, conjuge_atual_id: null }
          : person);
      if (isDemo) persistLocal(next);
      setPeople(next);
      setSuccessNote(removed.size > 1
        ? `A pessoa e mais ${removed.size - 1} descendentes foram removidos da árvore.`
        : 'A pessoa foi removida da árvore.');
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível remover a pessoa.');
    } finally {
      setBusy(false);
    }
  };

  const submitPersonForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activePerson || !formKind) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (formKind === 'edit') {
        const nome = String(form.get('nome') || '').trim();
        const sobrenome = String(form.get('sobrenome') || '').trim();
        if (!nome || !sobrenome) throw new Error('Informe nome e sobrenome.');
        const father = String(form.get('pai_id') || '');
        const mother = String(form.get('mae_id') || '');
        if (father && mother && father === mother) throw new Error('O pai e a mãe não podem ser a mesma pessoa.');
        const updated = await savePersonDetails(activePerson.id, {
          nome,
          sobrenome,
          sexo: String(form.get('sexo') || 'Nao informado'),
          data_nascimento: String(form.get('data_nascimento') || '') || null,
          data_falecimento: String(form.get('data_falecimento') || '') || null,
          cidade: String(form.get('cidade') || '').trim() || null,
          observacoes: String(form.get('observacoes') || '').trim() || null,
          pai_id: father ? Number(father) : null,
          mae_id: mother ? Number(mother) : null,
        });
        setSuccessNote(`Dados de ${updated.nome} atualizados.`);
        closeModal();
        return;
      }
      if (formKind === 'photo') {
        const file = form.get('photo');
        if (!(file instanceof File) || !file.size) throw new Error('Escolha uma imagem antes de continuar.');
        await savePhoto(activePerson.id, file);
        setSuccessNote(`Foto de ${activePerson.nome} atualizada.`);
        closeModal();
        return;
      }
      const nome = String(form.get('nome') || '').trim();
      const sobrenome = String(form.get('sobrenome') || '').trim();
      if (!nome || !sobrenome) throw new Error('Informe nome e sobrenome.');
      const sex = String(form.get('sexo') || '');
      const firstParent = String(form.get('pai_id') || '');
      const secondParent = String(form.get('mae_id') || '');
      const spouse = formKind === 'spouse';
      const newPerson: Omit<Person, 'id'> & { relationship_type?: 'child' | 'spouse' } = {
        nome, sobrenome, sexo: sex || null,
        ramo: activePerson.ramo || Number(form.get('ramo') || 1),
        data_nascimento: String(form.get('data_nascimento') || '') || null,
        data_falecimento: String(form.get('data_falecimento') || '') || null,
        cidade: String(form.get('cidade') || '').trim() || null,
        observacoes: String(form.get('observacoes') || '').trim() || null,
        pai_id: spouse ? null : (firstParent ? Number(firstParent) : null),
        mae_id: spouse ? null : (secondParent ? Number(secondParent) : null),
        conjuge_atual_id: spouse ? activePerson.id : null,
        foto_url: null,
        latitude: form.get('latitude') ? Number(form.get('latitude')) : null,
        longitude: form.get('longitude') ? Number(form.get('longitude')) : null,
        relationship_type: spouse ? 'spouse' : 'child',
      };
      if (spouse) {
        const newSpouse = await savePerson(newPerson);
        const updated = (isDemo ? localTree().people : people).map((person) => person.id === activePerson.id ? { ...person, conjuge_atual_id: newSpouse.id } : person);
        if (isDemo) persistLocal(updated);
        setPeople((current) => current.map((person) => person.id === activePerson.id ? { ...person, conjuge_atual_id: newSpouse.id } : person));
      } else {
        await savePerson(newPerson);
      }
      setSuccessNote(`${nome} foi adicionado à árvore.`);
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar os dados.');
    } finally {
      setBusy(false);
    }
  };

  const exportSvg = () => {
    const cardWidth = 204;
    const cardHeight = 68;
    const slotWidth = 222;
    const rowHeight = 126;
    const startY = 306;
    const knownIds = new Set([1, 2]);
    const colors: Record<number, string> = { 1: '#55764e', 2: '#bb7139', 3: '#4577a4', 4: '#8560a0', 5: '#b14e55' };
    const branchGroups = branchInfo.map((branch) => ({
      id: branch.id,
      title: `${branch.title} Dembogurski`,
      color: colors[branch.id],
      people: people.filter((person) => person.id !== 1 && person.id !== 2 && person.ramo === branch.id),
    }));
    const unassigned = people.filter((person) => person.id !== 1 && person.id !== 2 && !branchInfo.some((branch) => branch.id === person.ramo));
    if (unassigned.length) branchGroups.push({ id: 0, title: 'Outros vínculos', color: '#77816d', people: unassigned });

    type ExportGroup = (typeof branchGroups)[number] & {
      x: number;
      width: number;
      levels: Map<number, number>;
      maxLevel: number;
    };
    type ExportPosition = { x: number; y: number; groupId: number };
    const layouts: ExportGroup[] = [];
    const positions = new Map<number, ExportPosition>();
    let cursorX = 34;

    for (const group of branchGroups) {
      const members = new Map(group.people.map((person) => [person.id, person]));
      const levels = new Map<number, number>();
      const levelFor = (person: Person, visiting = new Set<number>()): number => {
        const cached = levels.get(person.id);
        if (cached !== undefined) return cached;
        if (visiting.has(person.id)) return 0;
        const nextVisiting = new Set(visiting).add(person.id);
        const parentIds = [person.pai_id, person.mae_id].filter((id): id is number => id !== null && members.has(id));
        const level = parentIds.length
          ? Math.max(...parentIds.map((id) => levelFor(members.get(id)!, nextVisiting))) + 1
          : 0;
        levels.set(person.id, level);
        return level;
      };
      group.people.forEach((person) => levelFor(person));
      for (let pass = 0; pass < group.people.length; pass += 1) {
        let changed = false;
        for (const person of group.people) {
          const spouse = person.conjuge_atual_id ? members.get(person.conjuge_atual_id) : undefined;
          if (!spouse) continue;
          const sharedLevel = Math.max(levels.get(person.id) || 0, levels.get(spouse.id) || 0);
          if (levels.get(person.id) !== sharedLevel || levels.get(spouse.id) !== sharedLevel) {
            levels.set(person.id, sharedLevel);
            levels.set(spouse.id, sharedLevel);
            changed = true;
          }
        }
        if (!changed) break;
      }
      const generationCounts = new Map<number, number>();
      group.people.forEach((person) => {
        const level = levels.get(person.id) || 0;
        generationCounts.set(level, (generationCounts.get(level) || 0) + 1);
      });
      const maxCount = Math.max(1, ...generationCounts.values());
      const columnWidth = Math.max(300, maxCount * slotWidth + 38);
      const layout: ExportGroup = {
        ...group, x: cursorX, width: columnWidth, levels,
        maxLevel: Math.max(0, ...levels.values()),
      };
      layouts.push(layout);
      const byLevel = new Map<number, Person[]>();
      for (const person of group.people) {
        const level = levels.get(person.id) || 0;
        const row = byLevel.get(level) || [];
        row.push(person);
        byLevel.set(level, row);
      }
      for (const [level, row] of byLevel) {
        row.sort((a, b) => fullName(a).localeCompare(fullName(b), 'pt-BR') || a.id - b.id);
        const rowWidth = row.length * slotWidth - (slotWidth - cardWidth);
        const firstX = cursorX + (columnWidth - rowWidth) / 2;
        row.forEach((person, index) => positions.set(person.id, {
          x: firstX + index * slotWidth,
          y: startY + level * rowHeight,
          groupId: group.id,
        }));
      }
      cursorX += columnWidth + 22;
    }

    const ancestors = people.filter((person) => person.id === 1 || person.id === 2);
    const totalWidth = Math.max(900, cursorX - 22 + 34);
    const centerX = totalWidth / 2;
    const ancestorPositions = new Map<number, ExportPosition>();
    ancestors.forEach((person, index) => ancestorPositions.set(person.id, {
      x: centerX - 216 + index * 232,
      y: 112,
      groupId: -1,
    }));
    ancestorPositions.forEach((position, id) => positions.set(id, position));
    const maxLevel = Math.max(0, ...layouts.map((layout) => layout.maxLevel));
    const totalHeight = Math.max(430, startY + (maxLevel + 1) * rowHeight + 45);
    const elements: string[] = [];

    elements.push(`<rect width="${totalWidth}" height="${totalHeight}" fill="#f4f0e6"/>`);
    elements.push(`<text x="${centerX}" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="31" fill="#254632">${escapeXml('Árvore da Família Dembogurski')}</text>`);
    elements.push(`<text x="${centerX}" y="72" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="#77806f">${escapeXml('Matias e Sophia · raízes, ramos, gerações')}</text>`);

    const ancestorIds = new Set(ancestors.map((person) => person.id));
    const ancestorPairs = new Set<string>();
    for (const person of ancestors) {
      const spouseId = person.conjuge_atual_id;
      const spouse = spouseId ? people.find((candidate) => candidate.id === spouseId) : undefined;
      const ownPosition = positions.get(person.id);
      const spousePosition = spouse ? positions.get(spouse.id) : undefined;
      if (spouse && ownPosition && spousePosition) {
        const key = [person.id, spouse.id].sort((a, b) => a - b).join(':');
        if (!ancestorPairs.has(key)) {
          ancestorPairs.add(key);
          elements.push(`<path d="M ${ownPosition.x + cardWidth} ${ownPosition.y + 34} H ${spousePosition.x}" fill="none" stroke="#b69c60" stroke-width="2"/>`);
        }
      }
    }
    for (const layout of layouts) {
      elements.push(`<text x="${layout.x + layout.width / 2}" y="254" text-anchor="middle" font-family="Georgia,serif" font-size="21" font-weight="bold" fill="${layout.color}">${escapeXml(layout.title)}</text>`);
      elements.push(`<path d="M ${layout.x + 8} 269 H ${layout.x + layout.width - 8}" stroke="${layout.color}" stroke-opacity=".28" stroke-width="1"/>`);
    }

    for (const person of people) {
      const childPosition = positions.get(person.id);
      if (!childPosition || ancestorIds.has(person.id)) continue;
      const parentPositions = [person.pai_id, person.mae_id]
        .filter((id): id is number => id !== null)
        .map((id) => positions.get(id))
        .filter((position): position is ExportPosition => position !== undefined);
      if (!parentPositions.length) continue;
      const childCenter = childPosition.x + cardWidth / 2;
      const junctionY = childPosition.y - 22;
      if (parentPositions.length === 1) {
        const parent = parentPositions[0];
        const parentCenter = parent.x + cardWidth / 2;
        elements.push(`<path d="M ${parentCenter} ${parent.y + cardHeight} V ${junctionY} L ${childCenter} ${junctionY} V ${childPosition.y}" fill="none" stroke="#a89d7c" stroke-width="1.5"/>`);
      } else {
        const centers = parentPositions.map((position) => position.x + cardWidth / 2);
        const left = Math.min(...centers);
        const right = Math.max(...centers);
        parentPositions.forEach((parent) => {
          const parentCenter = parent.x + cardWidth / 2;
          elements.push(`<path d="M ${parentCenter} ${parent.y + cardHeight} V ${junctionY}" fill="none" stroke="#a89d7c" stroke-width="1.5"/>`);
        });
        elements.push(`<path d="M ${left} ${junctionY} H ${right} M ${childCenter} ${junctionY} V ${childPosition.y}" fill="none" stroke="#a89d7c" stroke-width="1.5"/>`);
      }
    }

    const spousePairs = new Set<string>();
    for (const person of people) {
      const spouseId = person.conjuge_atual_id;
      if (!spouseId) continue;
      const spouse = people.find((candidate) => candidate.id === spouseId);
      const ownPosition = positions.get(person.id);
      const spousePosition = positions.get(spouseId);
      if (!spouse || !ownPosition || !spousePosition) continue;
      const key = [person.id, spouseId].sort((a, b) => a - b).join(':');
      if (spousePairs.has(key)) continue;
      spousePairs.add(key);
      if (ancestorIds.has(person.id) && ancestorIds.has(spouseId)) continue;
      const left = ownPosition.x <= spousePosition.x ? ownPosition : spousePosition;
      const right = left === ownPosition ? spousePosition : ownPosition;
      const y = Math.min(ownPosition.y, spousePosition.y) + 34;
      elements.push(`<path d="M ${left.x + cardWidth} ${y} H ${right.x}" fill="none" stroke="#b69c60" stroke-width="2" stroke-dasharray="4 4"/>`);
    }

    for (const person of people) {
      const position = positions.get(person.id);
      if (!position) continue;
      const group = layouts.find((item) => item.id === position.groupId);
      const color = group?.color || '#49654a';
      const name = fullName(person);
      const subline = person.cidade || (person.id === 1 || person.id === 2 ? 'Nossos ancestrais' : `Ramo ${person.ramo || 'familiar'}`);
      elements.push(`<g aria-label="${escapeXml(name)}"><title>${escapeXml(name)}</title><rect x="${position.x}" y="${position.y}" width="${cardWidth}" height="${cardHeight}" rx="8" fill="#fffdf7" stroke="${color}" stroke-width="1.5"/><rect x="${position.x}" y="${position.y}" width="5" height="${cardHeight}" rx="2" fill="${color}"/><text x="${position.x + 15}" y="${position.y + 29}" font-family="Georgia,serif" font-size="16" font-weight="bold" fill="#344a37">${escapeXml(name)}</text><text x="${position.x + 15}" y="${position.y + 50}" font-family="sans-serif" font-size="11" fill="#77806f">${escapeXml(subline)}</text></g>`);
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-labelledby="svg-title"><title id="svg-title">${escapeXml('Árvore da Família Dembogurski')}</title>${elements.join('')}</svg>`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    link.download = 'arvore-familia-dembogurski.svg';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const renderPerson = (person: Person, branchId: number, depth = 0, seen = new Set<number>()): ReactNode => {
    if (seen.has(person.id)) return null;
    const nextSeen = new Set(seen).add(person.id);
    const descendants = visibleDescendants(person);
    const spouse = person.conjuge_atual_id ? personMap.get(person.conjuge_atual_id) : null;
    return (
      <div
        className="person-wrap"
        key={person.id}
        style={{ '--person-tree-width': `${treeWidths.get(person.id) ?? personCardWidth}px` } as CSSProperties}
      >
        <button className="person-card" data-testid={`family-person-${branchId}-${person.id}`} onClick={() => openActions(person)} aria-label={`Abrir ações de ${fullName(person)}`}>
          <span className="person-title"><PersonAvatar person={person} branchId={branchId} />{fullName(person)}</span>
          <span className="person-sub">{person.cidade || (depth === 0 ? 'Filho(a) de Matias e Sophia' : 'Descendente da família')}</span>
          {showSpouses && spouse && <span className="spouse-chip"><span className="spouse-dot" /> Cônjuge: {fullName(spouse)}</span>}
        </button>
        {descendants.length > 0 && (
          <div
            className="person-child-list generation-row"
            role="group"
            aria-label={`Filhos de ${fullName(person)}`}
            data-testid={`family-children-${branchId}-${person.id}`}
            style={generationStyle(descendants)}
          >
            {descendants.map((child) => renderPerson(child, branchId, depth + 1, nextSeen))}
          </div>
        )}
      </div>
    );
  };

  const displayBranches = filteredBranches.filter((branch) => !query || branch.roots.length > 0 || branch.headMatches);
  const totalLiving = people.filter((person) => person.id > 2).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Árvore da Família Dembogurski, início">
          <span className="brand-mark"><TreeDeciduous size={22} strokeWidth={1.6} /></span>
          <span><span className="brand-name">FAMÍLIA DEMBOGURSKI</span><span className="brand-caption">Raízes · Ramos · Gerações</span></span>
        </a>
        <div className="top-actions">
          <button className="button" onClick={exportSvg}><Download size={15} /> Baixar SVG</button>
          <button className="button primary" onClick={() => { if (view !== 'tree') { setView('tree'); window.setTimeout(() => window.print(), 120); } else window.print(); }}><Printer size={15} /> Imprimir árvore</button>
        </div>
      </header>

      <section className="intro">
        <div>
          <div className="eyebrow">Arquivo vivo da família</div>
          <h1 className="serif">De nossas raízes,<br />aos novos ramos.</h1>
          <p>Uma história que continua em nós. Encontre seu ramo e descubra as pessoas que fazem parte da nossa família.</p>
        </div>
        <div className="intro-stats" aria-label="Resumo da árvore">
          <div className="stat"><strong>{totalLiving}</strong><span>nomes na árvore</span></div>
          <div className="stat"><strong>5</strong><span>ramos da família</span></div>
          <div className="stat"><strong><Clock3 size={15} /></strong><span>atualiza a cada 15 s</span></div>
        </div>
      </section>

      <section className="toolbar" aria-label="Ferramentas da árvore">
        <label className="searchbox">
          <Search size={16} aria-hidden="true" />
          <input ref={searchRef} type="search" placeholder="Buscar alguém pelo nome..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar pessoa pelo nome" />
        </label>
        <span className="toolbar-divider" />
        <div className="branch-pills" role="group" aria-label="Filtrar por ramo">
          <button className={`branch-pill ${selectedBranch === null ? 'active' : ''}`} onClick={() => setBranch(null)}>Todos os ramos</button>
          {branchInfo.map((branch) => <button key={branch.id} className={`branch-pill ${selectedBranch === branch.id ? 'active' : ''}`} onClick={() => setBranch(selectedBranch === branch.id ? null : branch.id)}>{branch.title}</button>)}
        </div>
        <div className="toolbar-end">
          <div className="view-switch" role="group" aria-label="Modo de visualização">
            <button className={`view-button ${view === 'tree' ? 'selected' : ''}`} onClick={() => setView('tree')} aria-pressed={view === 'tree'}><TreeDeciduous size={14} /> Árvore</button>
            <button className={`view-button ${view === 'map' ? 'selected' : ''}`} onClick={() => setView('map')} aria-pressed={view === 'map'}><MapIcon size={14} /> Mapa</button>
          </div>
          <div className="toggle-control">
            <button className={`switch ${showSpouses ? 'on' : ''}`} onClick={() => setShowSpouses((value) => !value)} role="switch" aria-checked={showSpouses} aria-label="Mostrar cônjuges" />
            <span>Cônjuges</span>
          </div>
          <button className="button small quiet" onClick={() => { setLoading(true); setRefreshTick((value) => value + 1); }} aria-label="Atualizar árvore"><RotateCw size={15} /> Atualizar</button>
        </div>
      </section>

      {view === 'map' && !loading && !loadError ? (
        <FamilyMap people={people} selectedBranch={selectedBranch} query={query} onFocusBranch={setBranch} onSetLocation={canEdit ? (person) => { setActivePerson(person); setFormKind('location'); } : undefined} />
      ) : <section className="tree-stage" aria-label="Árvore genealógica interativa" ref={treeStageRef}>
        {loading ? (
          <div className="loading-wrap" aria-label="Carregando árvore"><div className="loading-card">{Array.from({ length: 5 }, (_, i) => <div className="skeleton" key={i} />)}</div></div>
        ) : loadError ? (
          <div className="error-wrap"><div className="error-box"><AlertCircle size={24} color="#a15340" /><h2>Não foi possível abrir a árvore</h2><p>{loadError}</p><button className="button primary" onClick={() => { setLoading(true); setRefreshTick((value) => value + 1); }}><RotateCw size={15} /> Tentar novamente</button></div></div>
        ) : query && displayBranches.length === 0 ? (
          <div className="empty-search"><CircleHelp size={26} /><h3>Nenhum nome encontrado</h3><p>Confira a escrita ou tente buscar por outro nome.</p><button className="button small" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>Limpar busca</button></div>
        ) : (
          <div className="tree-content">
            <div className="tree-scroll-hint" aria-hidden="true">↔ Quando a árvore ultrapassar a tela, deslize para explorar os ramos</div>
            <div className="ancestor-wrap">
              <div className="ancestor-card">
                <div className="ancestor-person"><div className="name">Matias</div><small>Dembogurski</small></div>
                <span className="ancestor-heart"><Heart size={17} /></span>
                <div className="ancestor-person"><div className="name">Sophia</div><small>Dembogurski</small></div>
                <span className="stage-label">Nossos ancestrais</span>
              </div>
            </div>
            <div className="branch-grid" style={{ '--branch-count': displayBranches.length } as CSSProperties}>
              {displayBranches.map((branch) => {
                const BranchIcon = branch.icon;
                const branchSpouse = branch.headPerson?.conjuge_atual_id ? personMap.get(branch.headPerson.conjuge_atual_id) : null;
                const headChildren = branch.headPerson ? visibleDescendants(branch.headPerson) : [];
                const branchMembersPeople = [...headChildren, ...branch.roots];
                const branchMembers = [
                  ...headChildren.map((child) => renderPerson(child, branch.id, 1, new Set([branch.headPerson!.id]))),
                  ...branch.roots.map((person) => renderPerson(person, branch.id)),
                ];
                return (
                  <article className="branch-column" data-branch={branch.id} key={branch.id}>
                    <div className="branch-head">
                      <button
                        className="branch-person-action"
                        onClick={() => branch.headPerson && openActions(branch.headPerson)}
                        aria-label={branch.headPerson ? `Abrir ações de ${fullName(branch.headPerson)}` : `${branch.title} Dembogurski`}
                        disabled={!branch.headPerson}
                      >
                        <span className="branch-seal"><BranchIcon size={16} /></span>
                        <strong>{branch.headPerson ? fullName(branch.headPerson) : `${branch.title} Dembogurski`}</strong>
                        <small>{branch.headPerson?.cidade || 'Filho(a) de Matias e Sophia'}</small>
                        {showSpouses && branchSpouse && <span className="branch-spouse">Cônjuge: {fullName(branchSpouse)}</span>}
                      </button>
                      <button
                        className="branch-meta"
                        onClick={() => setBranch(selectedBranch === branch.id ? null : branch.id)}
                        aria-label={`Focar ramo ${branch.id}`}
                        aria-pressed={selectedBranch === branch.id}
                      >
                        Ramo {branch.id} <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="branch-tree">
                      {branchMembers.length ? (
                        <div
                          className="descendants generation-row"
                          role="group"
                          aria-label={`Descendientes del ramo ${branch.id}`}
                          data-testid={`branch-generation-${branch.id}`}
                          style={generationStyle(branchMembersPeople, branchHeadWidth)}
                        >
                          {branchMembers}
                        </div>
                      ) : query && branch.headMatches ? null : (
                        <div className="empty-branch">{query ? 'Nenhum nome neste ramo corresponde à busca.' : 'Esta história ainda espera novos nomes.'}{!query && canEdit && <button onClick={() => { setActivePerson(branch.headPerson || people.find((person) => person.id === (branch.id + 2)) || people[0] || null); setFormKind('child'); }}>Adicionar familiar</button>}</div>
                      )}
                    </div>
                    <p className="branch-quote">{branch.phrase}</p>
                  </article>
                );
              })}
            </div>
            <footer className="tree-foot">
              <span><strong>Família · Pertencimento · Memória · Encontro · Futuro</strong></span>
              <span className="sync-note">Sincronizado há instantes · atualiza automaticamente</span>
              <span>{isDemo ? 'Prévia local — alterações salvas neste navegador' : 'Arquivo da família Dembogurski'}</span>
            </footer>
          </div>
        )}
      </section>
      }

      {successNote && <div className="success-toast" role="status"><Check size={16} />{successNote}<button onClick={() => setSuccessNote('')} aria-label="Dispensar"><X size={13} /></button></div>}

      {activePerson && !formKind && (
        <Modal title={fullName(activePerson)} kicker={`Ramo ${activePerson.ramo || 'ancestral'} · dados da família`} onClose={closeModal}>
          <div className="person-detail-top">
            <PersonAvatar person={activePerson} branchId={activePerson.ramo || 1} large />
            <div><div className="detail-name">{fullName(activePerson)}</div><div className="detail-meta">{formatSex(activePerson.sexo)}{activePerson.cidade ? ` · ${activePerson.cidade}` : ''}</div></div>
          </div>
          <div className="detail-grid">
            <div className="detail-field"><label>Nascimento</label><span>{formatDate(activePerson.data_nascimento)}</span></div>
            <div className="detail-field"><label>Falecimento</label><span>{formatDate(activePerson.data_falecimento)}</span></div>
            <div className="detail-field"><label>Pai</label><span>{activePerson.pai_id ? (personMap.get(activePerson.pai_id) ? fullName(personMap.get(activePerson.pai_id)!) : 'Não informado') : 'Não informado'}</span></div>
            <div className="detail-field"><label>Mãe</label><span>{activePerson.mae_id ? (personMap.get(activePerson.mae_id) ? fullName(personMap.get(activePerson.mae_id)!) : 'Não informado') : 'Não informado'}</span></div>
            <div className="detail-field"><label>Cônjuge</label><span>{activePerson.conjuge_atual_id && personMap.get(activePerson.conjuge_atual_id) ? fullName(personMap.get(activePerson.conjuge_atual_id)!) : 'Não informado'}</span></div>
            <div className="detail-field"><label>Cidade</label><span>{activePerson.cidade || 'Não informada'}</span></div>
            <div className="detail-field"><label>Localização</label><span>{activePerson.latitude !== null && activePerson.longitude !== null ? `${activePerson.latitude.toFixed(4)}, ${activePerson.longitude.toFixed(4)}` : 'Não definida'}</span></div>
          </div>
          {activePerson.observacoes && <div className="detail-notes">{activePerson.observacoes}</div>}
          {canEdit ? <div className="action-list">
            <button className="action-row" onClick={() => { setFormKind('edit'); setFormError(''); }}>
              <span className="action-icon"><Pencil size={16} /></span><span className="action-copy"><strong>Editar dados da pessoa</strong><small>Corrigir datas e atualizar outras informações</small></span><ChevronRight size={16} />
            </button>
            <button className="action-row" onClick={() => { setFormKind('child'); setFormError(''); }}>
              <span className="action-icon"><UserPlus size={16} /></span><span className="action-copy"><strong>Agregar filho ou filha</strong><small>Adicionar uma nova pessoa neste ramo</small></span><ChevronRight size={16} />
            </button>
            <button className="action-row" onClick={() => { setFormKind('spouse'); setFormError(''); }}>
              <span className="action-icon"><Link2 size={16} /></span><span className="action-copy"><strong>Vincular cônjuge</strong><small>Registrar um vínculo conjugal</small></span><ChevronRight size={16} />
            </button>
            <button className="action-row" onClick={() => { setFormKind('photo'); setFormError(''); }}>
              <span className="action-icon"><Camera size={16} /></span><span className="action-copy"><strong>Subir ou cambiar foto</strong><small>Atualizar o retrato desta pessoa</small></span><ChevronRight size={16} />
            </button>
            <button className="action-row" onClick={() => { setFormKind('location'); setFormError(''); }}>
              <span className="action-icon"><MapPin size={16} /></span><span className="action-copy"><strong>Definir localização</strong><small>Compartilhada com quem vê o mapa da família</small></span><ChevronRight size={16} />
            </button>
            <button
              className="action-row action-row-danger"
              data-testid="remove-family-person"
              onClick={() => { setFormKind('delete'); setFormError(''); }}
            >
              <span className="action-icon action-icon-danger"><Trash2 size={16} /></span><span className="action-copy"><strong>Eliminar pessoa</strong><small>Remover esta pessoa e seus descendentes</small></span><ChevronRight size={16} />
            </button>
          </div> : <p className="form-hint">Seu acesso permite consultar a árvore. Somente organizadores autorizados podem adicionar pessoas, alterar fotos ou mudar localizações.</p>}
        </Modal>
      )}

      {activePerson && formKind === 'delete' && (
        <Modal title="Eliminar pessoa" kicker="Confirme a remoção" onClose={() => setFormKind(null)}>
          <div className="delete-warning" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div>
              <strong>Esta ação é permanente.</strong>
              <p>
                {removalIds.size > 1
                  ? `Serão removidos ${fullName(activePerson)} e mais ${removalIds.size - 1} descendentes diretos ou indiretos.`
                  : `${fullName(activePerson)} será removido da árvore.`}
                {' '}Cônjuges não serão removidos apenas pelo vínculo conjugal.
              </p>
            </div>
          </div>
          {formError && <div className="form-error" role="alert">{formError}</div>}
          <div className="modal-actions">
            <button type="button" className="button" onClick={() => setFormKind(null)} disabled={busy}>Cancelar</button>
            <button
              type="button"
              className="button danger"
              data-testid="confirm-delete-person"
              onClick={() => { void removePerson(); }}
              disabled={busy}
            >
              <Trash2 size={15} />{busy ? 'Eliminando…' : 'Confirmar eliminação'}
            </button>
          </div>
        </Modal>
      )}

      {activePerson && formKind && formKind !== 'location' && formKind !== 'delete' && (
        <Modal
          title={formKind === 'edit' ? 'Editar dados da pessoa' : formKind === 'child' ? 'Agregar filho ou filha' : formKind === 'spouse' ? 'Vincular cônjuge' : 'Foto de família'}
          kicker={`${fullName(activePerson)} · ${formKind === 'photo' ? 'retrato' : formKind === 'edit' ? 'atualizar cadastro' : 'novo registro'}`}
          onClose={() => setFormKind(null)}
        >
          {formKind === 'photo' ? (
            <form onSubmit={submitPersonForm}>
              <p className="form-hint">Escolha uma imagem nítida para preservar este retrato no arquivo da família.</p>
              <div className="upload-area"><Camera size={24} color="#66805e" /><div className="form-hint">JPG ou PNG · máximo de 8 MB</div><input type="file" name="photo" accept="image/jpeg,image/png,.jpg,.jpeg,.png" required aria-label="Selecionar foto da pessoa" /></div>
              {formError && <div className="form-error" role="alert">{formError}</div>}
              <div className="modal-actions"><button type="button" className="button" onClick={() => setFormKind(null)}>Voltar</button><button className="button primary" disabled={busy}>{busy ? 'Enviando…' : 'Salvar foto'}</button></div>
            </form>
          ) : formKind === 'edit' ? (
            <form onSubmit={submitPersonForm}>
              <p className="form-hint">Atualize qualquer dado que esteja incompleto ou incorreto. Datas, cidade, pais e observações são opcionais.</p>
              <div className="form-grid">
                <div className="field"><label htmlFor="edit-nome">Nome *</label><input id="edit-nome" name="nome" defaultValue={activePerson.nome} autoFocus required maxLength={100} /></div>
                <div className="field"><label htmlFor="edit-sobrenome">Sobrenome *</label><input id="edit-sobrenome" name="sobrenome" defaultValue={activePerson.sobrenome} required maxLength={150} /></div>
                <div className="field"><label htmlFor="edit-sexo">Sexo</label><select id="edit-sexo" name="sexo" defaultValue={activePerson.sexo === 'M' || activePerson.sexo === 'Masculino' ? 'M' : activePerson.sexo === 'F' || activePerson.sexo === 'Feminino' ? 'F' : activePerson.sexo || 'Nao informado'}><option value="Nao informado">Não informado</option><option value="F">Feminino</option><option value="M">Masculino</option><option value="Outro">Outro</option></select></div>
                <div className="field"><label htmlFor="edit-cidade">Cidade</label><input id="edit-cidade" name="cidade" defaultValue={activePerson.cidade || ''} placeholder="Ex.: Curitiba, PR" maxLength={160} /></div>
                <div className="field"><label htmlFor="edit-pai">Pai biológico</label><select id="edit-pai" name="pai_id" defaultValue={activePerson.pai_id ? String(activePerson.pai_id) : ''}><option value="">Não informado</option>{people.filter((person) => person.id !== activePerson.id && (person.sexo === 'M' || person.sexo === 'Masculino' || person.id === activePerson.pai_id)).map((person) => <option value={person.id} key={person.id}>{fullName(person)}</option>)}</select></div>
                <div className="field"><label htmlFor="edit-mae">Mãe biológica</label><select id="edit-mae" name="mae_id" defaultValue={activePerson.mae_id ? String(activePerson.mae_id) : ''}><option value="">Não informado</option>{people.filter((person) => person.id !== activePerson.id && (person.sexo === 'F' || person.sexo === 'Feminino' || person.id === activePerson.mae_id)).map((person) => <option value={person.id} key={person.id}>{fullName(person)}</option>)}</select></div>
                <div className="field"><label htmlFor="edit-nascimento">Data de nascimento</label><input id="edit-nascimento" name="data_nascimento" type="date" defaultValue={activePerson.data_nascimento?.slice(0, 10) || ''} /></div>
                <div className="field"><label htmlFor="edit-falecimento">Data de falecimento</label><input id="edit-falecimento" name="data_falecimento" type="date" defaultValue={activePerson.data_falecimento?.slice(0, 10) || ''} /><small>Deixe em branco se a pessoa estiver viva.</small></div>
                <div className="field full"><label htmlFor="edit-observacoes">Observações e memórias</label><textarea id="edit-observacoes" name="observacoes" defaultValue={activePerson.observacoes || ''} placeholder="Uma lembrança, história ou detalhe que vale guardar…" maxLength={4000} /></div>
              </div>
              {formError && <div className="form-error" role="alert">{formError}</div>}
              <div className="modal-actions"><button type="button" className="button" onClick={() => setFormKind(null)}>Cancelar</button><button className="button primary" disabled={busy}><Check size={15} />{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
            </form>
          ) : (
            <form onSubmit={submitPersonForm}>
              <p className="form-hint">{formKind === 'spouse' ? 'O vínculo conjugal não substitui os pais biológicos.' : 'É possível indicar um ou dois pais biológicos, independentemente de vínculo conjugal.'}</p>
              <div className="form-grid">
                <div className="field"><label htmlFor="nome">Nome *</label><input id="nome" name="nome" autoFocus required maxLength={80} /></div>
                <div className="field"><label htmlFor="sobrenome">Sobrenome *</label><input id="sobrenome" name="sobrenome" defaultValue={formKind === 'child' ? 'Dembogurski' : ''} required maxLength={100} /></div>
                <div className="field"><label htmlFor="sexo">Sexo</label><select id="sexo" name="sexo" defaultValue="Nao informado"><option value="Nao informado">Não informado</option><option value="F">Feminino</option><option value="M">Masculino</option><option value="Outro">Outro</option></select></div>
                <div className="field"><label htmlFor="cidade">Cidade</label><input id="cidade" name="cidade" placeholder="Ex.: Curitiba, PR" maxLength={120} /></div>
                {formKind === 'child' && (
                  <>
                    <div className="field"><label htmlFor="pai_id">Pai biológico</label><select id="pai_id" name="pai_id" defaultValue={activePerson.sexo === 'M' || activePerson.sexo === 'Masculino' ? String(activePerson.id) : ''}><option value="">Não informado</option>{people.filter((person) => person.sexo === 'M' || person.sexo === 'Masculino').map((person) => <option value={person.id} key={person.id}>{fullName(person)}</option>)}</select></div>
                    <div className="field"><label htmlFor="mae_id">Mãe biológica</label><select id="mae_id" name="mae_id" defaultValue={activePerson.sexo === 'F' || activePerson.sexo === 'Feminino' ? String(activePerson.id) : ''}><option value="">Não informado</option>{people.filter((person) => person.sexo === 'F' || person.sexo === 'Feminino').map((person) => <option value={person.id} key={person.id}>{fullName(person)}</option>)}</select></div>
                  </>
                )}
                <div className="field"><label htmlFor="data_nascimento">Data de nascimento</label><input id="data_nascimento" name="data_nascimento" type="date" /></div>
                <div className="field"><label htmlFor="data_falecimento">Data de falecimento</label><input id="data_falecimento" name="data_falecimento" type="date" /></div>
                <div className="field"><label htmlFor="latitude">Latitude</label><input id="latitude" name="latitude" type="number" step="any" placeholder="-25.4284" /></div>
                <div className="field"><label htmlFor="longitude">Longitude</label><input id="longitude" name="longitude" type="number" step="any" placeholder="-49.2733" /></div>
                <div className="field full"><label htmlFor="observacoes">Observações e memórias</label><textarea id="observacoes" name="observacoes" placeholder="Uma lembrança, história ou detalhe que vale guardar…" maxLength={1000} /></div>
              </div>
              {formError && <div className="form-error" role="alert">{formError}</div>}
              <div className="modal-actions"><button type="button" className="button" onClick={() => setFormKind(null)}>Voltar</button><button className="button primary" disabled={busy}><Plus size={15} />{busy ? 'Salvando…' : 'Adicionar à árvore'}</button></div>
            </form>
          )}
        </Modal>
      )}

      {activePerson && formKind === 'location' && (
        <Modal title="Definir localização" kicker={`${fullName(activePerson)} · mapa compartilhado`} onClose={closeModal}>
          <LocationForm
            person={activePerson}
            onCancel={() => setFormKind(null)}
            onSave={async (latitude, longitude) => {
              setFormError('');
              setBusy(true);
              try {
                await saveLocation(activePerson.id, latitude, longitude);
                setSuccessNote(`Localização de ${activePerson.nome} atualizada.`);
                closeModal();
              } catch (error) {
                setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a localização.');
              } finally {
                setBusy(false);
              }
            }}
            busy={busy}
            error={formError}
          />
        </Modal>
      )}
    </main>
  );
}

function formatSex(value: string | null) {
  if (value === 'F' || value === 'Feminino') return 'Feminino';
  if (value === 'M' || value === 'Masculino') return 'Masculino';
  if (value === 'Outro') return 'Outro';
  return 'Não informado';
}

function formatDate(value: string | null) {
  if (!value) return 'Não informada';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function LocationForm({ person, onCancel, onSave, busy, error }: {
  person: Person;
  onCancel: () => void;
  onSave: (latitude: number, longitude: number) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const latitude = Number(data.get('latitude'));
    const longitude = Number(data.get('longitude'));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return;
    void onSave(latitude, longitude);
  };
  return (
    <form onSubmit={submit}>
      <div className="privacy-note"><MapPin size={16} /><span>Esta localização ficará visível para outras pessoas que acessarem o mapa compartilhado da família.</span></div>
      <p className="form-hint location-help">Informe coordenadas decimais. Exemplo: Curitiba <strong>−25.4284, −49.2733</strong>.</p>
      <div className="form-grid">
        <div className="field"><label htmlFor="person-latitude">Latitude *</label><input id="person-latitude" name="latitude" type="number" step="any" min="-90" max="90" defaultValue={person.latitude ?? ''} placeholder="-25.4284" required /></div>
        <div className="field"><label htmlFor="person-longitude">Longitude *</label><input id="person-longitude" name="longitude" type="number" step="any" min="-180" max="180" defaultValue={person.longitude ?? ''} placeholder="-49.2733" required /></div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="button" onClick={onCancel}>Voltar</button><button className="button primary" disabled={busy}><MapPin size={15} />{busy ? 'Salvando…' : 'Salvar localização'}</button></div>
    </form>
  );
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char] || char));
}

export default App;