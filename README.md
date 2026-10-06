# Kawasaki Ninja ZX-4RR · Experiencia interactiva 3D

Página web informativa e interactiva (no oficial) sobre la Kawasaki Ninja ZX-4RR.
Todo funciona en el navegador: no necesita servidor propio, base de datos ni compilación.

## Qué incluye

| Sección | Qué se puede hacer |
|---|---|
| **Inicio** | Moto 3D girando, puntos interactivos que llevan a cada pieza y botón "mantén para acelerar" con sonido sintetizado del motor de 4 cilindros. |
| **Despiece 3D** | 80 piezas independientes: barra de explosión, arrastrar cualquier pieza con el ratón o el dedo, rayos X, etiquetas, aislar pieza (doble clic), motor animado (pistones, bielas, cigüeñal, levas, caja de cambios y cadena), filtros por sistema, buscador y ficha de cada pieza. |
| **Reto: arma la moto** | Minijuego contra reloj (5 niveles) con récord guardado en el navegador. |
| **Cockpit** | Pantalla TFT simulada: arranque, acelerador, cambio con quickshifter, freno con ABS, modos Sport / Road / Rain / Rider, KTRC 1-2-3-OFF, asfalto seco o mojado y telemetría en vivo. |
| **Configurador** | 6 decoraciones + colores personalizados, color de chasis y llantas, 3 escapes y 6 accesorios, todo aplicado en tiempo real sobre el modelo 3D. |
| **Comparativa** | Radar, cifras, aceleración estimada y una vuelta simulada en un circuito contra hasta 3 rivales. |
| **Cotización** | Resumen de precio **solo informativo** de la configuración (moneda y precio base editables, copiar, imprimir/PDF, guardar imagen). No hay pagos ni reservas. |
| **Ficha técnica** | Datos completos por categoría y diagrama de dimensiones sobre la vista lateral del modelo 3D. |

Navegación sin scroll: cada sección ocupa la pantalla y se cambia con las pestañas (o con las teclas `1` a `7`). En móvil las pestañas pasan a una barra inferior.

## Publicar en GitHub Pages

1. Sube **todo el contenido de esta carpeta** a la raíz del repositorio (`index.html`, `README.md` y las carpetas `css/` y `js/`).
2. En GitHub entra en **Settings → Pages**.
3. En **Build and deployment** elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guarda.
4. En uno o dos minutos la página estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Con Git desde la terminal (si el repositorio ya existe vacío):

```bash
git init
git add .
git commit -m "Experiencia interactiva 3D de la Ninja ZX-4RR"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-REPO.git
git push -u origin main
```

## Probar en el ordenador

- Lo más fiable es usar un pequeño servidor local desde esta carpeta, por ejemplo con Node: `npx serve .` y abrir la dirección que indique.
- También suele funcionar abriendo `index.html` con doble clic (necesita conexión a internet para cargar Three.js, las fuentes y los iconos).

## Estructura

```
index.html          Estructura de las 7 secciones
css/styles.css      Estilos (tema oscuro, adaptado a móvil)
js/data.js          TODOS los textos y datos: piezas, ficha técnica, rivales, colores, precios
js/bike.js          Modelo 3D procedural: las 80 piezas, su posición de despiece y animación
js/viewer.js        Escena 3D, cámara, arrastre de piezas, rayos X, minijuego y capturas
js/sim.js           Simulación del motor y de la moto (rpm, marchas, KTRC, ABS)
js/audio.js         Sintetizador del sonido del motor (Web Audio API)
js/ui-*.js          Lógica de cada sección
js/main.js          Navegación, teclado y bucle principal
```

Para cambiar textos, precios de referencia, colores o rivales basta con editar `js/data.js`.

## Tecnología

- [Three.js](https://threejs.org/) 0.169 (WebGL) cargado desde CDN, sin archivos 3D externos: la moto se genera por código.
- Web Audio API para el sonido del motor.
- HTML, CSS y JavaScript sin frameworks ni compilación.

## Aviso

Proyecto de aficionados, sin relación oficial con Kawasaki. Las especificaciones son las publicadas por el fabricante para la ZX-4RR y pueden variar según el año y el mercado; las cifras de los rivales son aproximadas. Las simulaciones (sonido, física, vuelta al circuito, aceleración) son ilustrativas. Los precios de la cotización son solo de referencia: la página no vende, no reserva y no procesa pagos.
