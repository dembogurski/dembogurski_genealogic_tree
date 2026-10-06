# Árvore da Família Dembogurski

Aplicación web para consultar y mantener el árbol genealógico familiar. La vista de desarrollo usa datos guardados en el navegador; para compartir los cambios entre usuarios, instala la versión PHP/MySQL en Apache.

## Requisitos

- Node.js 24.x
- pnpm 10.x
- Para la instalación en servidor: Apache, PHP 8.x y MariaDB/MySQL

## Instalar y ejecutar en desarrollo

Desde la raíz del repositorio:

```sh
npm install --global pnpm@10
pnpm install --frozen-lockfile
pnpm --filter @workspace/arvore-dembogurski run dev
```

Vite muestra la dirección local en la terminal; normalmente es `http://localhost:5173`.

Para comprobar los tipos o generar la compilación web:

```sh
pnpm --filter @workspace/arvore-dembogurski run typecheck
pnpm --filter @workspace/arvore-dembogurski run build
```

## Preparar la instalación de Apache

Genera los archivos estáticos preparados para Apache:

```sh
pnpm --filter @workspace/arvore-dembogurski run build:apache
```

El paquete se genera en `artifacts/arvore-dembogurski/apache/`. Copia su contenido al directorio público del sitio, conserva el archivo `.htaccess` y la carpeta `uploads/`, y permite que el usuario de Apache escriba en `uploads/`.

### Crear e inicializar la base de datos

El script SQL está en:

`artifacts/arvore-dembogurski/apache/schema.sql`

Primero crea la base de datos y después importa el script:

```sh
mysql -u root -p -e "CREATE DATABASE familia_dembogurski CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p familia_dembogurski < artifacts/arvore-dembogurski/apache/schema.sql
```

Los comandos solicitan la contraseña de MySQL. `schema.sql` crea la tabla `pessoas` e inserta los registros iniciales de ejemplo si sus identificadores están disponibles. No elimina tablas ni registros existentes.

### Configurar PHP y las variables del servidor

El servidor necesita PHP 8.x con las extensiones `PDO MySQL`, `Fileinfo`, `GD` y `mbstring`. Configura estas variables en el entorno de Apache o PHP-FPM:

| Variable | Uso |
| --- | --- |
| `DB_HOST` | Dirección del servidor MySQL |
| `DB_PORT` | Puerto MySQL; opcional, predeterminado `3306` |
| `DB_NAME` | Nombre de la base; normalmente `familia_dembogurski` |
| `DB_USER` | Usuario de la base de datos |
| `DB_PASS` | Contraseña del usuario |
| `TREE_ORGANIZERS` | Nombres de usuario autorizados a editar, separados por comas |

Si `TREE_ORGANIZERS` falta o está vacío, las escrituras quedan bloqueadas. No guardes contraseñas ni valores reales en archivos versionados o en Git. Configura `upload_max_filesize = 8M` y `post_max_size = 10M` para aceptar fotos de hasta 8 MB.

Si el sitio estará disponible en Internet, usa HTTPS y configura autenticación de Apache antes de compartirlo. La [guía detallada de Apache/PHP/MySQL](artifacts/arvore-dembogurski/apache/README.md) incluye un ejemplo de autenticación y permisos.

## Persistencia

En la vista previa de desarrollo, los cambios de demostración se guardan únicamente en ese navegador. La persistencia compartida entre usuarios requiere instalar la API PHP y configurar MySQL según los pasos anteriores.
