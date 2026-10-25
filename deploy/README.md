# Implantação em dembogurski.com

Destino definido:

```text
Domínio: https://dembogurski.com
Código: /www/dembogurski
Portada: /www/dembogurski/portada/
Árvore: /www/dembogurski/artifacts/arvore-dembogurski/apache/
```

## Instalação rápida

Com o repositório clonado em `/www/dembogurski` e executado como `root`:

```bash
cd /www/dembogurski
bash deploy/install-dembogurski.sh
```

O instalador cria somente o virtual host de `dembogurski.com`, preserva os
outros domínios, gera uma senha aleatória para o banco e pede a senha do
administrador da árvore. Não execute `a2dissite 000-default`.

O instalador usa primeiro `root` pelo socket local do MariaDB. Em servidores
compartilhados que não permitem esse acesso, usa automaticamente
`/etc/mysql/debian.cnf` para criar o banco e o usuário exclusivo
`dembogurski_app`. Nenhuma senha de banco é colocada no Git ou num `.env`.
Se nenhuma dessas opções funcionar, solicita de forma oculta o usuário e a
senha de uma conta administrativa do MariaDB. Essas credenciais não são
armazenadas.

## 1. Gerar o pacote

Na raiz do projeto:

```powershell
pnpm package:site
Compress-Archive -Path .\dist\dembogurski-site\* -DestinationPath .\dist\dembogurski-site.zip -Force
```

O pacote contém a portada na raiz e a árvore em `arvore/`, com todos os
caminhos relativos já configurados.

## 2. DNS

No painel DNS de `dembogurski.com`, criar:

```text
A      @      IPv4_DA_HETZNER
A      www    IPv4_DA_HETZNER
AAAA   @      IPv6_DA_HETZNER (somente se o servidor tiver IPv6)
AAAA   www    IPv6_DA_HETZNER (somente se o servidor tiver IPv6)
```

Não use `CNAME` para `@`. O servidor ainda precisa ter um IP público antes de
preencher estes registros.

## 3. Preparar o servidor

Entrar por SSH e instalar:

```bash
sudo apt update
sudo apt install -y apache2 mariadb-server php php-mysql php-mbstring php-gd php-fileinfo certbot python3-certbot-apache apache2-utils unzip
sudo a2enmod auth_basic authn_file authz_user headers expires rewrite ssl
```

Criar as pastas:

```bash
sudo mkdir -p /etc/apache2/dembogurski
```

## 4. Base de dados

Entrar no MariaDB:

```bash
sudo mariadb
```

Executar, substituindo a senha:

```sql
CREATE DATABASE familia_dembogurski CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dembogurski_app'@'127.0.0.1' IDENTIFIED BY 'TROCAR_POR_SENHA_FORTE';
GRANT SELECT, INSERT, UPDATE, DELETE ON familia_dembogurski.* TO 'dembogurski_app'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

Depois de enviar o pacote:

```bash
sudo mariadb familia_dembogurski < /var/www/dembogurski/arvore/schema.sql
```

## 5. Usuário administrador do Apache

O primeiro comando cria o arquivo; os demais acrescentam usuários:

```bash
sudo htpasswd -B -c /etc/apache2/dembogurski/users.htpasswd admin
sudo htpasswd -B /etc/apache2/dembogurski/users.htpasswd outro_usuario
```

Criar a configuração privada do PHP:

```bash
sudo cp deploy/apache/database.conf.example /etc/apache2/dembogurski/database.conf
sudo nano /etc/apache2/dembogurski/database.conf
```

A senha em `DB_PASS` deve ser a mesma criada no MariaDB.

Permissões:

```bash
sudo chown root:www-data /etc/apache2/dembogurski
sudo chmod 2770 /etc/apache2/dembogurski
sudo chown root:www-data /etc/apache2/dembogurski/users.htpasswd
sudo chmod 660 /etc/apache2/dembogurski/users.htpasswd
sudo chown root:root /etc/apache2/dembogurski/database.conf
sudo chmod 600 /etc/apache2/dembogurski/database.conf
sudo chown -R www-data:www-data /var/www/dembogurski/arvore/uploads
```

## 6. Apache

Enviar o pacote para `/tmp`, extrair em `/var/www` e instalar o site:

```bash
sudo unzip /tmp/dembogurski-site.zip -d /var/www/dembogurski
sudo cp deploy/apache/dembogurski.com.conf /etc/apache2/sites-available/
sudo a2ensite dembogurski.com.conf
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## 7. HTTPS

Depois que o DNS apontar para o servidor:

```bash
sudo certbot --apache -d dembogurski.com -d www.dembogurski.com --redirect
```

O Certbot instala o certificado, cria o redirecionamento HTTPS e configura a
renovação automática.

## Resultado esperado

```text
https://dembogurski.com/         Portada pública
https://dembogurski.com/arvore/  Árvore pública; edição autenticada
```

A senha do MySQL, os usuários do Apache e `users-roles.json` nunca devem ser
colocados dentro de `/var/www/dembogurski`.
