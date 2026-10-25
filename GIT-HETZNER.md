# Publicar pelo Git e instalar no Hetzner

O repositório é o único projeto. No servidor, ele fica em
`/www/dembogurski`; a portada será servida diretamente desse diretório e a
árvore por um alias privado do Apache.

> **Atenção:** `https://github.com/dembogurski/dembogurski_genealogic_tree`
> está público neste momento. Se o código ou os dados de exemplo contêm
> informação familiar que não deve ser pública, altere o repositório para
> privado antes do próximo push.

## Antes do primeiro push

1. Decida se o repositório deve ser público. Nomes, fotografias e histórias de
   uma família normalmente pedem um repositório **privado**.
2. Nunca envie `.env`, `users.htpasswd`, `users-roles.json`, `acceso-local.txt`,
   `database.conf`, fotografias enviadas pela página ou dumps reais do banco.
3. Confirme o conteúdo:

```powershell
git status
git diff --stat
git diff --cached
```

4. Adicione e envie:

```powershell
git add .
git commit -m "Unifica portada e árvore no mesmo site"
git push origin main
```

## Preparar o servidor

Use uma pasta de código separada da pasta pública:

```bash
sudo apt update
sudo apt install -y git rsync apache2 mariadb-server php php-mysql php-mbstring php-gd php-fileinfo certbot python3-certbot-apache apache2-utils
sudo git clone https://github.com/dembogurski/dembogurski_genealogic_tree.git /www/dembogurski
```

Se o repositório for privado, configure uma deploy key de leitura no GitHub.

Executar o instalador:

```bash
cd /www/dembogurski
sudo bash deploy/install-dembogurski.sh
```

Continue com a configuração de MariaDB, usuários e Apache em
[`deploy/README.md`](deploy/README.md).

## Atualizações futuras

Depois de um novo push:

```bash
cd /www/dembogurski
sudo git pull --ff-only
sudo systemctl reload apache2
```

## Estrutura final

```text
/www/dembogurski                    Código Git
/www/dembogurski/portada            Portada pública
/www/dembogurski/artifacts/.../apache  Árvore protegida em /arvore/
/etc/apache2/dembogurski            Usuários e configuração privada
```
