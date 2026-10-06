import { Flower2, GitBranch, Heart, Leaf, Search, TreeDeciduous, Users } from 'lucide-react';
import './_group.css';
import './Current.css';

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

const people: Person[] = [
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

const branchInfo = [
  { id: 1, title: 'Miguel', phrase: 'Novos nomes, novas histórias.', icon: Leaf },
  { id: 2, title: 'Pedro', phrase: 'Memórias que nos conectam.', icon: Flower2 },
  { id: 3, title: 'João', phrase: 'Histórias que seguem adiante.', icon: GitBranch },
  { id: 4, title: 'Maria', phrase: 'Laços que atravessam gerações.', icon: Heart },
  { id: 5, title: 'Júlia', phrase: 'Novos caminhos, a mesma raiz.', icon: Users },
];

const fullName = (person: Person) => `${person.nome} ${person.sobrenome}`;
const personMap = new Map(people.map((person) => [person.id, person]));

function Avatar({ person, branchId }: { person: Person; branchId: number }) {
  return (
    <span className="person-avatar" data-branch={branchId}>
      {person.foto_url ? <img src={person.foto_url} alt="" /> : person.nome.slice(0, 1).toLocaleUpperCase('pt-BR')}
    </span>
  );
}

function PersonCard({ person, depth = 0, seen = new Set<number>() }: { person: Person; depth?: number; seen?: Set<number> }) {
  if (seen.has(person.id)) return null;
  const nextSeen = new Set(seen).add(person.id);
  const children = people.filter((candidate) => candidate.pai_id === person.id || candidate.mae_id === person.id);
  const spouse = person.conjuge_atual_id ? personMap.get(person.conjuge_atual_id) : null;
  return (
    <div className="person-wrap" key={person.id}>
      <button className="person-card">
        <span className="person-title"><Avatar person={person} branchId={person.ramo} />{fullName(person)}</span>
        <span className="person-sub">{person.cidade || (depth === 0 ? 'Filho(a) de Matias e Sophia' : 'Descendente da família')}</span>
        {spouse && <span className="spouse-chip"><span className="spouse-dot" /> Cônjuge: {fullName(spouse)}</span>}
      </button>
      {children.length > 0 && depth < 5 && (
        <div className="person-child-list">
          {children.map((child) => <PersonCard key={child.id} person={child} depth={depth + 1} seen={nextSeen} />)}
        </div>
      )}
    </div>
  );
}

export function Current() {
  return (
    <main className="current-tree-page">
      <header className="current-topbar">
        <div className="current-brand">
          <span className="current-brand-mark"><TreeDeciduous size={22} strokeWidth={1.6} /></span>
          <span><strong>FAMÍLIA DEMBOGURSKI</strong><small>RAÍZES · RAMOS · GERAÇÕES</small></span>
        </div>
        <span className="current-badge">PRÉVIA DA ÁRVORE ATUAL</span>
      </header>
      <section className="current-intro">
        <div><div className="current-eyebrow">Arquivo vivo da família</div><h1>De nossas raízes,<br />aos novos ramos.</h1></div>
        <p>Uma história que continua em nós. Encontre seu ramo e descubra as pessoas que fazem parte da nossa família.</p>
      </section>
      <div className="current-toolbar">
        <label className="current-search"><Search size={16} /><input placeholder="Buscar alguém pelo nome..." /></label>
        <div className="current-branch-filters"><button className="active">Todos os ramos</button><button>Miguel</button><button>Pedro</button><button>João</button><button>Maria</button><button>Júlia</button></div>
        <span className="current-total">12 nomes</span>
      </div>
      <section className="tree-stage current-tree-stage" aria-label="Visualização atual da árvore genealógica">
        <div className="ancestor-wrap">
          <div className="ancestor-card">
            <div className="ancestor-person"><div className="name">Matias</div><small>Dembogurski</small></div>
            <span className="ancestor-heart"><Heart size={17} /></span>
            <div className="ancestor-person"><div className="name">Sophia</div><small>Dembogurski</small></div>
            <span className="stage-label">Nossos ancestrais</span>
          </div>
        </div>
        <div className="branch-grid">
          {branchInfo.map((branch) => {
            const head = people.find((person) => person.ramo === branch.id && (person.pai_id === 1 || person.mae_id === 2));
            const spouse = head?.conjuge_atual_id ? personMap.get(head.conjuge_atual_id) : null;
            const BranchIcon = branch.icon;
            const children = head ? people.filter((person) => person.pai_id === head.id || person.mae_id === head.id) : [];
            return (
              <article className="branch-column" data-branch={branch.id} key={branch.id}>
                <div className="branch-head">
                  <span className="branch-seal"><BranchIcon size={16} /></span>
                  <strong>{head ? fullName(head) : `${branch.title} Dembogurski`}</strong>
                  <small>{head?.cidade || 'Filho(a) de Matias e Sophia'}</small>
                  {spouse && <span className="branch-spouse">Cônjuge: {fullName(spouse)}</span>}
                  <span className="branch-meta">Ramo {branch.id} ›</span>
                </div>
                <div className="branch-tree">
                  {children.length ? <div className="descendants">{children.map((person) => <PersonCard key={person.id} person={person} depth={1} seen={new Set([head!.id])} />)}</div> : (
                    <div className="empty-branch">Esta história ainda espera novos nomes.</div>
                  )}
                </div>
                <p className="branch-quote">{branch.phrase}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}