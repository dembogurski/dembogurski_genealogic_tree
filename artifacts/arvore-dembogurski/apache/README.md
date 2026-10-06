# Instalación en Apache + PHP + MariaDB/MySQL

1. Cree una base de datos `familia_dembogurski` con juego de caracteres `utf8mb4` e importe `schema.sql`. El script no elimina tablas ni registros; crea la tabla e inserta los cinco ramos iniciales solo si sus IDs aún están disponibles.
2. Copie `api.php`, `db.php`, `schema.sql`, `index.html`, `app.js`, `styles.css` y la carpeta `uploads/` a una carpeta de Apache, por ejemplo `/var/www/html/arbol/`.
3. Permita que el usuario de Apache escriba en `uploads/` (en Debian suele ser `www-data`). Mantenga el `.htaccess` de esa carpeta para impedir la ejecución de scripts allí.
4. Configure `DB_HOST`, `DB_NAME`, `DB_USER` y `DB_PASS` en el entorno de PHP/Apache; `DB_PORT` es opcional y usa `3306` si se omite. Configure también `TREE_ORGANIZERS` con los nombres de usuario autorizados a editar, separados por comas. Si la lista no existe o está vacía, las escrituras quedan bloqueadas.
5. Habilite PHP 8.x y las extensiones PDO MySQL, Fileinfo, GD y mbstring. Configure `upload_max_filesize = 8M` y `post_max_size = 10M` para permitir fotos de hasta 8 MB.
6. Mantenga los valores reales fuera del repositorio. Puede definir `SetEnv` en un archivo de sitio Apache fuera del proyecto, o usar `env[DB_HOST]`, `env[DB_NAME]`, `env[DB_USER]`, `env[DB_PASS]` y `env[TREE_ORGANIZERS]` en el pool PHP-FPM. No agregue contraseñas a `db.php`, `.htaccess`, archivos versionados ni al historial de Git.

## Exigir autenticación en Apache

Use HTTPS antes de compartir el sitio en Internet. La autenticación básica solo protege las credenciales cuando toda la conexión usa TLS. Instale los módulos `auth_basic`, `authn_file` y `authz_user`, y cree el archivo de usuarios fuera de la carpeta pública:

```sh
sudo htpasswd -c /etc/apache2/familia-dembogurski.htpasswd lector
sudo htpasswd /etc/apache2/familia-dembogurski.htpasswd organizador1
```

El primer comando crea el archivo y pide la contraseña sin escribirla en el comando. Repita el segundo comando para cada usuario adicional, omitiendo `-c`. No guarde el archivo `.htpasswd` en el proyecto ni en el directorio público.

Agregue esta regla a la configuración del sitio Apache, ajustando la ruta real:

```apache
<Directory "/var/www/html/arbol">
    AuthType Basic
    AuthName "Árvore da Família Dembogurski"
    AuthBasicProvider file
    AuthUserFile /etc/apache2/familia-dembogurski.htpasswd
    Require valid-user
</Directory>
```

Esta regla protege la página, la API y los archivos de `uploads/` para que solo usuarios autenticados puedan leer el árbol, el mapa y las fotos. Compruebe que Apache transmite el nombre autenticado como `REMOTE_USER` a PHP. Añada los nombres exactos de los organizadores a `TREE_ORGANIZERS` en el entorno de PHP/Apache; los demás usuarios autenticados solo tendrán permiso de lectura. La API también rechaza escrituras sin un token CSRF de sesión válido.

El endpoint de consulta es `api.php?action=get_tree`; las escrituras usan `add_person`, `update_person`, `update_location`, `delete_person` y `upload_photo`. Al eliminar una persona, `delete_person` también elimina en una transacción a todos sus descendientes directos e indirectos; la interfaz pide confirmación antes de hacerlo. Cada persona puede tener latitud y longitud decimales (latitud entre −90 y 90; longitud entre −180 y 180). La vista de mapa carga sus teselas desde OpenStreetMap y muestra la atribución correspondiente; el navegador necesita conexión a Internet para cargarlas. Se aceptan fotos JPG/PNG de hasta 8 MB.

En la vista previa de Replit, los cambios de demostración se guardan únicamente en ese navegador. El modo colaborativo persistente lo proporciona la API PHP/MySQL al instalar este paquete en Apache.