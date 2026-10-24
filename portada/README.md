# Portada de dembogurski.com

Sitio estático independiente de la aplicación del árbol familiar. La portada se
muestra en portugués por defecto y permite cambiar a español desde el encabezado.
Incluye el 1º Encontro Família Dembogurski del 18/09/2027 en el Salão da
Comunidade de Rocinha, Três de Maio.

## Probar localmente

Desde la raíz del proyecto:

```powershell
python -m http.server 8088 --directory portada
```

Abrir `http://localhost:8088/`. Este servidor muestra únicamente la portada; la
versión integrada con Apache y el árbol está en `http://localhost/dembogurski/`.

Los botones del árbol usan la ruta relativa `./arvore/`. Funcionan tanto en la
raíz de `dembogurski.com` como en el alias local `/dembogurski/`.

## Estructura local unificada

La configuración de WAMP publica el proyecto en un solo sitio:

```text
http://localhost/dembogurski/         Portada pública
http://localhost/dembogurski/arvore/  Árbol con autenticación
```

Apache usa dos alias, pero ambos pertenecen al mismo proyecto y al mismo dominio.
La autenticación básica protege únicamente `/dembogurski/arvore/`.

## Publicar juntos en Hetzner

La estructura recomendada para el servidor es:

```text
/var/www/dembogurski.com/
├── index.html
├── assets/
├── .htaccess
└── arvore/
    ├── index.html
    ├── api.php
    ├── app.js
    ├── styles.css
    ├── uploads/
    └── ...
```

El contenido de esta carpeta va en la raíz pública. El paquete generado en
`artifacts/arvore-dembogurski/apache/` va dentro de `arvore/`. La autenticación
de Apache debe aplicarse solo a `/var/www/dembogurski.com/arvore/`, nunca a la
portada ni a `/assets/`.

La configuración completa de DNS, HTTPS, MySQL y Apache se realizará en la
etapa de despliegue, cuando el servidor de Hetzner esté disponible.
