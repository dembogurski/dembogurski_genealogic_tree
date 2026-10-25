# Instalación en Apache + PHP + MariaDB/MySQL

1. Cree una base de datos `familia_dembogurski` con juego de caracteres `utf8mb4` e importe `schema.sql`. El script no elimina tablas ni registros; crea la tabla e inserta los cinco ramos iniciales solo si sus IDs aún están disponibles.
2. Copie `api.php`, `admin-login.php`, `db.php`, `user-store.php`, `schema.sql`, `index.html`, `app.js`, `styles.css`, `project-nav.css` y la carpeta `uploads/` a una carpeta de Apache, por ejemplo `/var/www/html/arbol/`.
3. Permita que el usuario de Apache escriba en `uploads/` (en Debian suele ser `www-data`). Mantenga el `.htaccess` de esa carpeta para impedir la ejecución de scripts allí.
4. Configure `DB_HOST`, `DB_NAME`, `DB_USER` y `DB_PASS` en el entorno de PHP/Apache; `DB_PORT` es opcional y usa `3306` si se omite. Configure también `TREE_ORGANIZERS` con los nombres de usuario autorizados a editar, separados por comas. Si la lista no existe o está vacía, las escrituras quedan bloqueadas.
5. Habilite PHP 8.x y las extensiones PDO MySQL, Fileinfo, GD y mbstring. Configure `upload_max_filesize = 8M` y `post_max_size = 10M` para permitir fotos de hasta 8 MB.
6. Mantenga los valores reales fuera del repositorio. Puede definir `SetEnv` en un archivo de sitio Apache fuera del proyecto, o usar `env[DB_HOST]`, `env[DB_NAME]`, `env[DB_USER]`, `env[DB_PASS]` y `env[TREE_ORGANIZERS]` en el pool PHP-FPM. No agregue contraseñas a `db.php`, `.htaccess`, archivos versionados ni al historial de Git.

## Lectura pública y edición autenticada

Use HTTPS antes de compartir el sitio en Internet. La página y la consulta
`get_tree` son públicas; Apache solicita autenticación únicamente al abrir
`admin-login.php` o al enviar una escritura a `api.php`. Instale los módulos
`auth_basic`, `authn_file` y `authz_user`, y cree el archivo de usuarios fuera
de la carpeta pública:

```sh
sudo htpasswd -c /etc/apache2/familia-dembogurski.htpasswd lector
sudo htpasswd /etc/apache2/familia-dembogurski.htpasswd organizador1
```

El primer comando crea el archivo y pide la contraseña sin escribirla en el comando. Repita el segundo comando para cada usuario adicional, omitiendo `-c`. No guarde el archivo `.htpasswd` en el proyecto ni en el directorio público.

Agregue equivalentes a estas reglas a la configuración del sitio Apache:

```apache
<Location "/arvore/admin-login.php">
    AuthType Basic
    AuthName "Árvore da Família Dembogurski"
    AuthBasicProvider file
    AuthUserFile /etc/apache2/familia-dembogurski.htpasswd
    Require valid-user
</Location>

<Location "/arvore/api.php">
    AuthType Basic
    AuthName "Árvore da Família Dembogurski"
    AuthBasicProvider file
    AuthUserFile /etc/apache2/familia-dembogurski.htpasswd
    <RequireAny>
        Require expr "%{REQUEST_METHOD} =~ /^(GET|HEAD|OPTIONS)$/"
        Require valid-user
    </RequireAny>
</Location>
```

Después de autenticarse, `admin-login.php` crea una sesión para que la
interfaz muestre los controles de edición. Las escrituras también exigen un
perfil administrador y un token CSRF válido. Los lectores autenticados pueden
consultar, pero no modificar. Compruebe que Apache transmite el nombre
autenticado como `REMOTE_USER` a PHP.

## Administración de usuarios desde la página

Los administradores tienen una engranaje junto a **atualiza a cada 15 s** para crear usuarios, asignar el perfil **Administrador** o **Leitor**, cambiar contraseñas y excluir accesos. Los administradores pueden modificar todos los ramos y administrar cuentas; los lectores solo consultan. La aplicación no permite excluir ni quitar el perfil al usuario que está realizando la operación.

Configure `TREE_USERS_DIR` con una carpeta privada fuera del directorio público, que contenga `users.htpasswd`, y use ese mismo archivo en `AuthUserFile`. En la instalación WAMP local, PHP detecta automáticamente `../private/dembogurski` respecto a `DOCUMENT_ROOT`, por lo que no hace falta reiniciar Apache. Permita al usuario de PHP escribir en esa carpeta y en el archivo: la aplicación guarda contraseñas bcrypt compatibles con Apache y permisos en `users-roles.json`, usando `users.lock` para coordinar escrituras. Nunca coloque estos archivos dentro del sitio público ni en Git. La lista inicial de administradores viene de `TREE_ORGANIZERS`; tras guardar cuentas en el panel, los permisos guardados tienen prioridad. Los cambios de cuentas y permisos se aplican sin reiniciar Apache. La lista y las mutaciones también verifican el perfil en el servidor; todas las mutaciones requieren el token CSRF.

Los endpoints son `list_users` (GET), `save_user` y `delete_user` (POST). Las respuestas nunca incluyen contraseñas ni sus hashes. Una contraseña vacía al editar conserva la actual; una nueva necesita entre 8 y 72 bytes. Al cambiar la contraseña del usuario conectado, el navegador puede volver a pedir sus credenciales de autenticación básica.

El endpoint de consulta es `api.php?action=get_tree`; las escrituras usan `add_person`, `update_person`, `update_location`, `delete_person` y `upload_photo`. Al eliminar una persona, `delete_person` también elimina en una transacción a todos sus descendientes directos e indirectos; la interfaz pide confirmación antes de hacerlo. Cada persona puede tener latitud y longitud decimales (latitud entre −90 y 90; longitud entre −180 y 180). La vista de mapa carga sus teselas desde OpenStreetMap y muestra la atribución correspondiente; el navegador necesita conexión a Internet para cargarlas. Se aceptan fotos JPG/PNG de hasta 8 MB.

En la vista previa de Replit, los cambios de demostración se guardan únicamente en ese navegador. El modo colaborativo persistente lo proporciona la API PHP/MySQL al instalar este paquete en Apache.
