import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { Heart, MapPin, Minus, Plus, Search, ShieldAlert, TreeDeciduous, Users, X } from 'lucide-react';
import './_group.css';
import './Branching.css';

type Person = {
  id: number;
  nome: string;
  sobrenome: string;
  cidade: string | null;
  ramo: number;
  pai_id: number | null;
  mae_id: number | null;
  conjuge_atual_id: number | null;
  foto_url: string | null;
};

const initialPeople: Person[] = [
  { id: 1, nome: 'Matias', sobrenome: 'Dembogurski', cidade: null, ramo: 0, pai_id: null, mae_id: null, conjuge_atual_id: 2, foto_url: null },
  { id: 2, nome: 'Sophia', sobrenome: 'Dembogurski', cidade: null, ramo: 0, pai_id: null, mae_id: null, conjuge_atual_id: 1, foto_url: null },
  { id: 3, nome: 'Miguel', sobrenome: 'Dembogurski', cidade: 'Curitiba, PR', ramo: 1, pai_id: 1, mae_id: 2, conjuge_atual_id: 8, foto_url: null },
  { id: 4, nome: 'Pedro', sobrenome: 'Dembogurski', cidade: 'Ponta Grossa, PR', ramo: 2, pai_id: 1, mae_id: 2, conjuge_atual_id: 9, foto_url: null },
  { id: 5, nome: 'João', sobrenome: 'Dembogurski', cidade: 'São Paulo, SP', ramo: 3, pai_id: 1, mae_id: 2, conjuge_atual_id: 10, foto_url: null },
  { id: 6, nome: 'Maria', sobrenome: 'Dembogurski', cidade: 'Porto Alegre, RS', ramo: 4, pai_id: 1, mae_id: 2, conjuge_atual_id: null, foto_url: null },
  { id: 7, nome: 'Júlia', sobrenome: 'Dembogurski', cidade: 'Florianópolis, SC', ramo: 5, pai_id: 1, mae_id: 2, conjuge_atual_id: null, foto_url: null },
  { id: 8, nome: 'Helena', sobrenome: 'Almeida', cidade: 'Curitiba, PR', ramo: 1, pai_id: null, mae_id: null, conjuge_atual_id: 3, foto_url: null },
  { id: 9, nome: 'Antônio', sobrenome: 'Kowalski', cidade: null, ramo: 2, pai_id: null, mae_id: null, conjuge_atual_id: 4, foto_url: null },
  { id: 10, nome: 'Lígia', sobrenome: 'Martins', cidade: null, ramo: 3, pai_id: null, mae_id: null, conjuge_atual_id: 5, foto_url: null },
  { id: 11, nome: 'Ana', sobrenome: 'Dembogurski', cidade: null, ramo: 1, pai_id: 3, mae_id: 8, conjuge_atual_id: null, foto_url: null },
  { id: 12, nome: 'Rafael', sobrenome: 'Dembogurski', cidade: 'Curitiba, PR', ramo: 2, pai_id: 4, mae_id: 9, conjuge_atual_id: null, foto_url: null },
];

const fullName = (person: Person) => `${person.nome} ${person.sobrenome}`;

function collectDescendantIds(personId: number, people: Person[]) {
  const visited = new Set([personId]);
  const queue = [personId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const person of people) {
      if (
        !visited.has(person.id)
        && (person.pai_id === parentId || person.mae_id === parentId)
      ) {
        visited.add(person.id);
        queue.push(person.id);
      }
    }
  }

  visited.delete(personId);
  return [...visited];
}

function PersonAvatar({ person, className = '' }: { person: Person; className?: string }) {
  return (
    <span className={`person-avatar ${className}`} aria-hidden="true">
      {person.foto_url ? <img src={person.foto_url} alt="" /> : person.nome.slice(0, 1).toLocaleUpperCase('pt-BR')}
    </span>
  );
}

export function Branching() {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [selectedId, setSelectedId] = useState<number | null>(3);
  const [branchFilter, setBranchFilter] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [dialog, setDialog] = useState<'add' | 'remove' | null>(null);
  const [newName, setNewName] = useState('');
  const [notice, setNotice] = useState('Miguel está selecionado. As ações abaixo alteram somente esta prévia.');
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const personRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);

  const personMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const selectedPerson = selectedId === null ? null : personMap.get(selectedId) ?? null;
  const selectedDescendantIds = selectedPerson ? collectDescendantIds(selectedPerson.id, people) : [];
  const rootPeople = [personMap.get(1), personMap.get(2)].filter((person): person is Person => Boolean(person));
  const topGeneration = useMemo(
    () => people
      .filter((person) => person.pai_id === 1 && person.mae_id === 2)
      .sort((a, b) => a.ramo - b.ramo || a.id - b.id),
    [people],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const personMatches = (person: Person) => !normalizedQuery
    || fullName(person).toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    || (person.cidade?.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ?? false);
  const branchContainsMatch = (person: Person, visited = new Set<number>()): boolean => {
    if (visited.has(person.id)) return false;
    visited.add(person.id);
    const spouse = person.conjuge_atual_id ? personMap.get(person.conjuge_atual_id) : undefined;
    if (personMatches(person) || Boolean(spouse && personMatches(spouse))) return true;
    return people.some((child) => (
      (child.pai_id === person.id || child.mae_id === person.id)
      && branchContainsMatch(child, new Set(visited))
    ));
  };
  const visibleBranches = topGeneration.filter((person) => {
    if (branchFilter !== null && person.ramo !== branchFilter) return false;
    return !normalizedQuery || branchContainsMatch(person);
  });
  const selectedHasParents = Boolean(selectedPerson?.pai_id && selectedPerson?.mae_id);
  const selectedParentsPresent = selectedPerson
    ? Boolean(personMap.has(selectedPerson.pai_id ?? -1) || personMap.has(selectedPerson.mae_id ?? -1))
    : false;
  const canAddSibling = Boolean(selectedPerson && selectedHasParents && selectedParentsPresent);
  const matchingPeopleCount = people.filter(personMatches).length;
  const laneWidth = 224;
  const selectedSiblingContext = canAddSibling && selectedPerson
    ? `Os pais registrados de ${selectedPerson.nome} serão mantidos.`
    : '';

  useEffect(() => {
    if (dialog === 'add') nameInputRef.current?.focus();
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog]);

  const selectPerson = (person: Person) => {
    setSelectedId(person.id);
    setNotice(`${fullName(person)} está selecionado. As ações abaixo alteram somente esta prévia.`);
  };

  const focusPerson = (person: Person) => {
    setSelectedId(person.id);
    setNotice(`Mapa centralizado em ${fullName(person)}.`);
    requestAnimationFrame(() => personRefs.current[person.id]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }));
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !normalizedQuery) return;
    const match = people.find(personMatches);
    if (match) focusPerson(match);
  };

  const resetMap = () => {
    setZoom(1);
    setBranchFilter(null);
    setQuery('');
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setNotice('Mapa completo exibido.');
  };

  const goToRoots = () => {
    setBranchFilter(null);
    setQuery('');
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setNotice('Raízes da família centralizadas.');
  };

  const submitSibling = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPerson || !canAddSibling) return;
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const firstName = trimmedName.split(/\s+/)[0];
    const person: Person = {
      id: Math.max(...people.map((item) => item.id), 0) + 1,
      nome: firstName,
      sobrenome: trimmedName.split(/\s+/).slice(1).join(' ') || selectedPerson.sobrenome,
      cidade: null,
      ramo: selectedPerson.ramo,
      pai_id: selectedPerson.pai_id,
      mae_id: selectedPerson.mae_id,
      conjuge_atual_id: null,
      foto_url: null,
    };
    setPeople((current) => [...current, person]);
    setSelectedId(person.id);
    setDialog(null);
    setNewName('');
    setBranchFilter(null);
    setQuery('');
    setNotice(`${fullName(person)} foi incluído(a) como irmão(ã) de ${selectedPerson.nome} nesta prévia.`);
    requestAnimationFrame(() => personRefs.current[person.id]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }));
  };

  const removePerson = () => {
    if (!selectedPerson) return;
    const removedName = fullName(selectedPerson);
    const descendantIds = collectDescendantIds(selectedPerson.id, people);
    const removedIds = new Set([selectedPerson.id, ...descendantIds]);
    setPeople((current) => current
      .filter((person) => !removedIds.has(person.id))
      .map((person) => person.conjuge_atual_id !== null && removedIds.has(person.conjuge_atual_id)
        ? { ...person, conjuge_atual_id: null }
        : person));
    setSelectedId(null);
    setDialog(null);
    setNotice(`Prévia atualizada: ${removedName} e ${descendantIds.length} descendente(s) foram removidos. Os registros salvos não foram alterados.`);
  };

  const getChildGroups = (generation: Person[]) => {
    const generationIds = new Set(generation.map((person) => person.id));
    const groups = new Map<string, { ownerId: number; coParentId: number | null; children: Person[] }>();
    for (const child of people) {
      const fatherInGeneration = child.pai_id !== null && generationIds.has(child.pai_id);
      const motherInGeneration = child.mae_id !== null && generationIds.has(child.mae_id);
      if (!fatherInGeneration && !motherInGeneration) continue;
      const parentIds = [child.pai_id, child.mae_id]
        .filter((parentId): parentId is number => parentId !== null);
      const key = [...parentIds].sort((a, b) => a - b).join(':') || 'no-parent';
      const ownerId = parentIds
        .filter((parentId) => generationIds.has(parentId))
        .sort((a, b) => a - b)[0];
      if (ownerId === undefined) continue;
      const coParentId = parentIds.find((parentId) => parentId !== ownerId) ?? null;
      const group = groups.get(key) ?? { ownerId, coParentId, children: [] };
      if (!group.children.some((existing) => existing.id === child.id)) group.children.push(child);
      groups.set(key, group);
    }
    return [...groups.values()];
  };

  const renderedPeople = new Set<number>();
  const renderNode = (person: Person, generation: Person[]) => {
    if (renderedPeople.has(person.id)) return null;
    renderedPeople.add(person.id);
    const spouse = person.conjuge_atual_id ? personMap.get(person.conjuge_atual_id) : undefined;
    const parentNames = [person.pai_id, person.mae_id]
      .map((parentId) => parentId === null ? null : personMap.get(parentId)?.nome)
      .filter((name): name is string => Boolean(name));
    const childGroups = getChildGroups(generation)
      .filter((group) => group.ownerId === person.id)
      .map((group) => ({
        ...group,
        children: group.children
          .filter((child) => !normalizedQuery || branchContainsMatch(child))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id - b.id),
      }))
      .filter((group) => group.children.length > 0);
    return (
      <div className="family-node-wrap" key={person.id}>
        <article className={`family-node ${selectedId === person.id ? 'is-selected' : ''}`}>
          <div className="family-node-head">
            <span className="branch-avatar" aria-hidden="true"><Users size={15} strokeWidth={1.7} /></span>
            <div className="family-node-details">
              <button
                className="family-node-name"
                ref={(element) => { personRefs.current[person.id] = element; }}
                onClick={() => selectPerson(person)}
                aria-pressed={selectedId === person.id}
                aria-label={`${fullName(person)}${selectedId === person.id ? ', selecionado' : ''}`}
              >
                {fullName(person)}
              </button>
              <span className="family-node-place">
                {person.cidade
                  ? <><MapPin size={10} aria-hidden="true" />{person.cidade}</>
                  : parentNames.length > 0 ? `Filho(a) de ${parentNames.join(' e ')}` : 'Ancestral da família'}
              </span>
            </div>
          </div>
          <span className="family-node-branch">Ramo {person.ramo}</span>
          {spouse && (
            <div className="spouse-link" title="Cônjuge — vínculo relacionado, não uma linha de filiação">
              <Heart size={10} aria-hidden="true" />
              <PersonAvatar person={spouse} />
              <span><span className="spouse-label">Cônjuge</span> · {fullName(spouse)}</span>
            </div>
          )}
        </article>
        {childGroups.map((group, groupIndex) => {
          const coParent = group.coParentId === null ? undefined : personMap.get(group.coParentId);
          return (
            <div className="child-family" key={`${person.id}-${group.coParentId ?? 'unknown'}-${groupIndex}`}>
              {coParent && <div className="child-family-label">Filhos com {fullName(coParent)}</div>}
              <div className="children-connect" aria-hidden="true" />
              <div className="descendants-generation">
                {group.children.map((child) => renderNode(child, group.children))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="branching-page">
      <header className="branching-topbar">
        <div className="branching-brand">
          <span className="branching-brand-mark"><TreeDeciduous size={22} strokeWidth={1.6} /></span>
          <span><strong>FAMÍLIA DEMBOGURSKI</strong><small>RAÍZES · RAMOS · GERAÇÕES</small></span>
        </div>
        <span className="branching-edition"><span /> Prévia interativa</span>
      </header>

      <section className="branching-intro">
        <div>
          <div className="branching-kicker">Arquivo vivo da família</div>
          <h1>Uma raiz.<br />Muitos caminhos.</h1>
        </div>
        <p>Leia as gerações lado a lado. Siga cada ramo para descobrir onde as histórias da família se encontram.</p>
      </section>

      <section className="branching-toolbar" aria-label="Ferramentas da árvore familiar">
        <label className="branching-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar nome ou cidade…"
            aria-label="Buscar pessoa por nome ou cidade"
          />
        </label>
        <div className="branch-filters" aria-label="Filtrar por ramo">
          <button type="button" aria-pressed={branchFilter === null} onClick={() => setBranchFilter(null)}>Todos os ramos</button>
          {Array.from(new Set(topGeneration.map((person) => person.ramo))).sort((a, b) => a - b).map((branch) => {
            const head = topGeneration.find((person) => person.ramo === branch);
            return (
              <button key={branch} type="button" aria-pressed={branchFilter === branch} onClick={() => setBranchFilter(branch)}>
                {head?.nome ?? `Ramo ${branch}`}
              </button>
            );
          })}
        </div>
        <span className="branching-count" aria-live="polite">{matchingPeopleCount} nomes</span>
        <div className="branching-actions">
          <button className="branching-action branching-action--primary" type="button" disabled={!canAddSibling} onClick={() => setDialog('add')} title={canAddSibling ? 'Adicionar irmão ou irmã à geração' : 'Selecione uma pessoa que tenha pais registrados'}>
            <Plus size={14} /> Irmão(ã)
          </button>
          <button className="branching-action branching-action--remove" type="button" disabled={!selectedPerson} onClick={() => setDialog('remove')} title="Remover pessoa desta prévia">
            <X size={14} /> Remover
          </button>
        </div>
      </section>

      <section className="branching-viewport" ref={viewportRef} aria-label="Mapa genealógico; deslize para navegar pelas gerações">
        {visibleBranches.length === 0 ? (
          <div className="empty-search">
            <strong>Nenhum ramo encontrado</strong>
            <p>{normalizedQuery ? `Não encontramos correspondências para “${query.trim()}”.` : 'Não há pessoas neste filtro.'} Limpe a busca ou escolha outro ramo.</p>
          </div>
        ) : (
          <div className="branching-map" ref={mapRef} style={{ zoom } as CSSProperties}>
            <div className="map-caption"><TreeDeciduous size={12} /> Mapa das relações · leitura de cima para baixo</div>
            <div className="ancestor-generation">
              <div className="ancestor-couple" aria-label="Ancestrais">
                {rootPeople.map((person, index) => (
                  <span className="ancestor-person-wrap" key={person.id}>
                    <button
                      className="ancestor-person"
                      ref={(element) => { personRefs.current[person.id] = element; }}
                      onClick={() => selectPerson(person)}
                      aria-pressed={selectedId === person.id}
                    >
                      <PersonAvatar person={person} />
                      <span><span className="ancestor-person-name">{person.nome}</span><span className="ancestor-person-surname">{person.sobrenome}</span></span>
                    </button>
                    {index === 0 && rootPeople.length > 1 && (
                      <>
                        <span className="ancestor-heart" aria-hidden="true"><Heart size={15} /></span>
                        <span className="visually-hidden">unidos em casal com</span>
                      </>
                    )}
                  </span>
                ))}
              </div>
              <div className="ancestor-label">Ancestrais · primeira geração</div>
            </div>
            <div className="root-stem" aria-hidden="true" />
            <div
              className="siblings-generation"
              style={{ '--sibling-count': visibleBranches.length, '--lane-width': `${laneWidth}px` } as CSSProperties}
            >
              {visibleBranches.map((person) => (
                <section className="sibling-lane" data-branch={person.ramo} key={person.id} aria-label={`Ramo de ${person.nome}`}>
                  {renderNode(person, topGeneration)}
                </section>
              ))}
            </div>
            <div className="map-legend" aria-label="Legenda das relações">
              <span className="legend-item"><span className="legend-line" /> Filiação</span>
              <span className="legend-item"><span className="legend-dash" /> Cônjuge</span>
            </div>
          </div>
        )}
        <div className="map-controls" aria-label="Navegação do mapa">
          <button type="button" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => setZoom((current) => Math.max(.65, Number((current - .1).toFixed(2))))}><Minus size={14} /></button>
          <span className="zoom-readout" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => setZoom((current) => Math.min(1.35, Number((current + .1).toFixed(2))))}><Plus size={14} /></button>
          <button type="button" aria-label="Centralizar ancestrais" title="Centralizar ancestrais" onClick={goToRoots}><TreeDeciduous size={14} /></button>
          <button type="button" aria-label="Ajustar mapa completo" title="Ajustar mapa completo" onClick={resetMap}><Search size={13} /></button>
        </div>
      </section>
      <div className="branching-status" aria-live="polite">
        <span className="branching-note"><ShieldAlert size={12} /> Prévia local: alterações nesta tela não modificam os registros salvos da família.</span>
        <span className="visually-hidden">{notice}</span>
      </div>

      {dialog && (
        <div className="branching-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="branching-dialog" role="dialog" aria-modal="true" aria-labelledby="branching-dialog-title">
            <div className="dialog-top">
              <div>
                <div className="dialog-kicker">{dialog === 'add' ? 'Abrir espaço na geração' : 'Ação de prévia'}</div>
                <h2 className="dialog-title" id="branching-dialog-title">{dialog === 'add' ? 'Adicionar irmão ou irmã' : 'Remover pessoa e descendentes?'}</h2>
              </div>
              <button type="button" className="dialog-close" aria-label="Fechar diálogo" onClick={() => setDialog(null)}><X size={15} /></button>
            </div>
            {dialog === 'add' ? (
              <form onSubmit={submitSibling}>
                <p className="dialog-copy">A nova pessoa aparecerá ao lado de <strong>{selectedPerson ? fullName(selectedPerson) : 'quem foi selecionado'}</strong>, na mesma geração.</p>
                <p className="dialog-hint">{selectedSiblingContext} Os vínculos desta inclusão existem somente na prévia.</p>
                <label className="dialog-label" htmlFor="new-sibling-name">Nome da pessoa</label>
                <input
                  ref={nameInputRef}
                  id="new-sibling-name"
                  className="dialog-input"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ex.: Clara Dembogurski"
                  autoComplete="off"
                  required
                />
                <div className="dialog-actions">
                  <button className="branching-action" type="button" onClick={() => setDialog(null)}>Cancelar</button>
                  <button className="branching-action branching-action--primary" type="submit"><Plus size={14} /> Adicionar à prévia</button>
                </div>
              </form>
            ) : (
              <>
                <p className="dialog-copy">
                  {selectedPerson && selectedDescendantIds.length > 0
                    ? <>Remover <strong>{fullName(selectedPerson)}</strong> e seus <strong>{selectedDescendantIds.length} descendente(s)</strong> de todas as gerações desta prévia?</>
                    : <>Remover <strong>{selectedPerson ? fullName(selectedPerson) : 'esta pessoa'}</strong> desta prévia? Não há descendentes para remover.</>}
                </p>
                <div className="dialog-alert"><ShieldAlert size={15} /> A remoção em cascata afeta somente esta prévia local. Os registros salvos da família não serão alterados.</div>
                <div className="dialog-actions">
                  <button className="branching-action" type="button" onClick={() => setDialog(null)}>Manter pessoa</button>
                  <button className="branching-action dialog-danger" type="button" onClick={removePerson}><X size={14} /> Remover da prévia</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}