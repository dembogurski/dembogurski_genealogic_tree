# Árvore da Família Dembogurski

Aplicación web para consultar y mantener el árbol genealógico familiar. La vista de desarrollo usa datos guardados en el navegador; para compartir los cambios entre usuarios, instala la versión PHP/MySQL en Apache.

El proyecto incluye una portada pública en la raíz del sitio y el árbol en `/arvore/`. Cualquier visitante puede consultar el árbol; la edición requiere entrar con una cuenta autorizada desde **Entrar como administrador**. En WAMP, las direcciones locales son `http://localhost/dembogurski/` y `http://localhost/dembogurski/arvore/`.

En **Definir localização**, escribe una ciudad o lugar, pulsa **Buscar** y selecciona un resultado para completar la latitud y la longitud. Confirma con **Salvar localização**. Las coordenadas también se pueden editar manualmente.

La búsqueda requiere Internet y consulta [Photon](https://github.com/komoot/photon), con datos de OpenStreetMap. Envía únicamente el texto de la búsqueda, no el registro familiar. Las consultas se realizan al pulsar Buscar y los resultados se reutilizan durante la sesión; el servicio público puede limitar solicitudes o estar temporalmente indisponible. El proveedor se configura en `src/location-search.ts`.

Para proyectar, usa **Projetar** en la barra del árbol: abre pantalla completa y ajusta todos los niveles del ramo seleccionado. **Ajustar à tela** recalcula el zoom al cambiar la pantalla, el ramo o los datos. Los botones de zoom y **100%** permiten explorar detalles sin cambiar el tamaño de la interfaz. Puedes seleccionar **Todos os ramos** en esa misma barra. Para salir de pantalla completa, usa **Sair da tela cheia** o Esc. En árboles muy grandes, el ajuste completo reduce los textos: selecciona un ramo o amplía el zoom para leer los nombres.

Los administradores tienen una engranaje junto a **atualiza a cada 15 s** para crear usuarios, definir perfiles **Administrador** y **Leitor**, cambiar contraseñas y eliminar accesos. Los cambios se aplican sin reiniciar Apache. La configuración de la carpeta privada y la recuperación por consola están en [USUARIOS-WAMP.md](USUARIOS-WAMP.md).

El título incluye un brasão simbólico original a su derecha. Su referencia histórica, significado y prompt de creación están en [BRASAO-DEMBOGURSKI.md](BRASAO-DEMBOGURSKI.md).

**Imprimir árvore** abre una vista previa con todos los ramos y generaciones, aunque la página esté filtrada, con zoom o mostrando el mapa. **Imprimir** ajusta el contenido completo a una sola página A4 horizontal, con márgenes de 10 mm. **Voltar à árvore** restaura la vista, filtro y zoom anteriores. El tamaño de los nombres depende de la cantidad de personas que deban entrar en la hoja.

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

Si el sitio estará disponible en Internet, usa HTTPS. La lectura del árbol es pública y la autenticación de Apache se solicita solo para entrar como editor o enviar cambios. La [guía detallada de Apache/PHP/MySQL](artifacts/arvore-dembogurski/apache/README.md) incluye la configuración y los permisos.

## Persistencia

En la vista previa de desarrollo, los cambios de demostración se guardan únicamente en ese navegador. La persistencia compartida entre usuarios requiere instalar la API PHP y configurar MySQL según los pasos anteriores.
