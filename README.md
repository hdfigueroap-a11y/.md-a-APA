# APA7 — Markdown a Normas APA 7ma edición

Aplicación web (100% en el navegador, sin backend) que convierte un archivo `.md` o texto pegado en un manuscrito formateado según el *Publication Manual of the American Psychological Association*, 7ma edición: portada, encabezados de 5 niveles, párrafos con sangría e interlineado doble, citas en bloque y referencias con sangría francesa. Exporta el resultado a Word (`.doc`) o a PDF (impresión del navegador).

**[Ver demo →](#)** *(reemplaza este enlace por tu URL de GitHub Pages una vez publicado, ver más abajo)*

## Características

- Entrada de texto pegado o carga de un archivo `.md` / `.txt`
- Formulario de portada: título, autor(a), afiliación, curso, docente, fecha, y elección entre versión **estudiante** o **profesional**
- Motor de conversión de Markdown a HTML con las reglas de APA 7:
  - El primer `#` del documento se usa como título de portada (no aparece en el cuerpo)
  - `##` a `######` generan los 5 niveles de encabezado APA con su estilo exacto (centrado/izquierda, negrita/cursiva, en línea)
  - Párrafos con sangría de primera línea de 0.5" e interlineado doble
  - Citas de 40 palabras o más se convierten automáticamente en cita en bloque (sin comillas, con sangría); las más cortas quedan en línea con comillas
  - Una sección `## Referencias` (o `References` / `Bibliografía`) activa el modo de sangría francesa: cada párrafo separado por una línea en blanco se trata como una referencia independiente
  - Tablas en formato Markdown (GFM, con `|`) convertidas a formato APA 7: numeradas automáticamente («Tabla 1», «Tabla 2»...), con título en cursiva y nota al pie, y solo bordes horizontales (nunca verticales), como pide el manual
- Vista previa en vivo, estilo "hoja de papel"
- Exportación a `.doc` (se abre directamente en Microsoft Word, conservando fuente, márgenes e interlineado) y a PDF vía impresión del navegador
- Sin dependencias externas ni build step: es HTML + CSS + JS puro

## Uso local

No requiere instalación. Basta con abrir `index.html` en el navegador:

```bash
git clone https://github.com/<tu-usuario>/apa7-formatter.git
cd apa7-formatter
open index.html   # macOS
# o simplemente arrastra index.html a tu navegador
```

Si prefieres un servidor local (recomendado para evitar restricciones de algunos navegadores con `file://`):

```bash
npx serve .
# o
python3 -m http.server 8000
```

## Publicar en GitHub Pages

1. Sube este repositorio a GitHub.
2. Ve a **Settings → Pages**.
3. En **Source**, elige la rama `main` y la carpeta `/ (root)`.
4. Guarda; en unos minutos tu app estará disponible en `https://<tu-usuario>.github.io/apa7-formatter/`.

## Estructura del proyecto

```
apa7-formatter/
├── index.html      # Estructura de la app y formulario de portada
├── styles.css       # Tema visual (tokens de color/tipografía + estilos de la hoja APA)
├── app.js            # Parser de Markdown, motor de formato APA 7 y exportación
├── README.md
├── LICENSE
└── .gitignore
```

## Tablas

Usa la sintaxis estándar de tablas Markdown (GFM). Puedes agregar un título y una nota opcionales justo después de la tabla, sin línea en blanco entre medio:

```markdown
| Dispositivo | Interfaz | Dirección IP |
|-------------|----------|---------------|
| R1          | G0/1.1   | 192.168.1.1   |
| S1          | VLAN 1   | 192.168.1.11  |
Tabla: Direccionamiento IP de la práctica
Nota: Todas las máscaras son /24 salvo la interfaz Loopback0.
```

`Tabla:` (o `Table:`) se convierte en el título en cursiva; `Nota:` (o `Note:`) se convierte en la nota al pie con el formato *Nota.* que exige APA 7. Las tablas se numeran automáticamente en el orden en que aparecen.

## Limitaciones conocidas

- El parser de Markdown es intencionalmente simple (encabezados, negrita, cursiva, código en línea, listas, citas, tablas y párrafos). No soporta imágenes ni enlaces con sintaxis `[texto](url)`.
- La numeración automática de página no se genera en la vista previa ni en el `.doc`; Word la agrega automáticamente al usar *Insertar → Número de página* tras abrir el archivo exportado.
- Siempre revisa el resultado antes de entregar tu trabajo: esta herramienta automatiza el formato, no reemplaza la revisión de contenido ni de citas.

## Licencia

MIT — ver [LICENSE](LICENSE).
