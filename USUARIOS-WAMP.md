# Usuarios del árbol en WAMP

Portada local: http://localhost/dembogurski/

Árbol local: http://localhost/dembogurski/arvore/

La consulta de la portada y del árbol es pública. Para editar, pulsa **Entrar
como administrador** en el árbol e introduce una cuenta autorizada.

## Administrar desde la página

Entra como administrador y pulsa la **engranaje** junto a **atualiza a cada 15 s**. Solo los administradores pueden verla y acceder al panel.

- **Novo usuário:** escribe el usuario, elige **Leitor** o **Administrador** y define la contraseña dos veces.
- **Editar:** cambia el perfil o la contraseña. Deja la contraseña vacía para mantenerla.
- **Excluir:** elimina el acceso tras confirmar; conserva los datos de la familia.

Los administradores pueden editar todos los ramos y administrar cuentas. Los lectores pueden consultar el árbol y el mapa. No puedes excluir tu propio acceso ni quitarte el perfil de administrador. Los cambios se aplican sin reiniciar WAMP; la página reconoce cambios de permisos al actualizar automáticamente cada 15 segundos. Si cambias tu propia contraseña, el navegador puede pedirla otra vez: utiliza la nueva.

Apache sigue comprobando los accesos en `C:\wamp\private\dembogurski\users.htpasswd`. El panel guarda los permisos en `users-roles.json`, en la misma carpeta privada; las contraseñas se guardan como hashes bcrypt. La lista `TREE_ORGANIZERS` solo define el permiso inicial para cuentas sin un perfil guardado. Después de utilizar el panel, cambia los perfiles desde la página.

Los comandos siguientes se conservan como alternativa para recuperar o crear accesos desde este equipo.

## Cambiar una contraseña

Abre PowerShell y ejecuta:

```powershell
& "C:\wamp\bin\apache\apache2.4.59\bin\htpasswd.exe" -B "C:\wamp\private\dembogurski\users.htpasswd" admin
```

Escribe la nueva contraseña dos veces cuando lo solicite. La contraseña no aparecerá en pantalla. El archivo `acceso-local.txt` conserva la contraseña inicial; después de cambiarla, esa contraseña anterior ya no sirve.

## Agregar un usuario

Este ejemplo crea `joao`; cambia ese nombre por el que necesites:

```powershell
& "C:\wamp\bin\apache\apache2.4.59\bin\htpasswd.exe" -B "C:\wamp\private\dembogurski\users.htpasswd" joao
```

El comando solicita su contraseña. No añadas `-c`: esa opción reemplazaría el archivo y borraría las demás cuentas.

Un nuevo usuario creado por consola comienza como lector, salvo que esté incluido en `TREE_ORGANIZERS`. Para convertirlo en administrador, utiliza **Editar** en el panel. Antes de que exista un perfil guardado para esa cuenta, también puedes definir su permiso inicial en `C:\wamp\private\dembogurski\apache.conf`:

```apache
SetEnv TREE_ORGANIZERS admin,joao
```

Conserva los nombres existentes. Reinicia Apache desde WAMP después de cambiar esta lista. Un perfil guardado en `users-roles.json` tiene prioridad sobre ella. Los cambios realizados desde el panel no requieren reinicio.

## Acceso desde otros equipos

La configuración actual tiene `Require local`: solo permite entrar desde este equipo. En otro equipo, `localhost` se refiere a ese otro equipo.

Para compartirlo en una red local hay que permitir la subred en Apache, habilitar su entrada en el firewall y dar a los demás una dirección como `http://IP-DE-ESTE-EQUIPO/dembogurski/`. La portada no exige contraseña; el árbol continúa en `http://IP-DE-ESTE-EQUIPO/dembogurski/arvore/`. Eso todavía no está habilitado. Para compartirlo por Internet se necesita configurar alojamiento, HTTPS y una dirección pública; no basta con crear usuarios.

## Simulacro del 2026-10-09

Se agregaron 28 personas ficticias, marcadas en `observacoes` con `SIMULACRO-2026-10-09-codex`. João tiene cuatro niveles nuevos de descendientes. La copia anterior está fuera del sitio público, en `C:\wamp\private\dembogurski\antes-simulacro-20261009.sql`.

Para retirar exclusivamente el simulacro desde PowerShell:

```powershell
& "C:\wamp\bin\mysql\mysql8.3.0\bin\mysql.exe" --host=127.0.0.1 --port=3306 --user=root --execute="SOURCE C:/wamp/www/dembogurski/scripts/retirar-simulacro-20261009.sql"
```

El script se detiene si encuentra personas ajenas al simulacro vinculadas a los datos ficticios. No retires pruebas con la función de eliminar descendientes si después agregaste personas reales bajo ellas.

Documentación: [htpasswd](https://httpd.apache.org/docs/2.4/programs/htpasswd.html), [restricciones por IP y acceso local](https://httpd.apache.org/docs/2.4/mod/mod_authz_host.html).
