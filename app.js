/* ============================================================
   APA7 — convertidor de Markdown/texto a Normas APA 7ma edición
   Sin dependencias externas: todo corre en el navegador.

   Convención de encabezados (el # se reserva para el título
   de portada, igual que en un documento normal):
     #      -> Título del trabajo (va en la portada, no en el cuerpo)
     ##     -> Encabezado APA nivel 1 (centrado, negrita)
     ###    -> Encabezado APA nivel 2 (izquierda, negrita)
     ####   -> Encabezado APA nivel 3 (izquierda, negrita cursiva)
     #####  -> Encabezado APA nivel 4 (sangría, negrita, en línea)
     ###### -> Encabezado APA nivel 5 (sangría, negrita cursiva, en línea)
   ============================================================ */

(function () {
  "use strict";

  const els = {
    title: document.getElementById("f-title"),
    author: document.getElementById("f-author"),
    affil: document.getElementById("f-affil"),
    course: document.getElementById("f-course"),
    instructor: document.getElementById("f-instructor"),
    date: document.getElementById("f-date"),
    mdInput: document.getElementById("md-input"),
    fileInput: document.getElementById("file-input"),
    btnSample: document.getElementById("btn-sample"),
    btnClear: document.getElementById("btn-clear"),
    btnConvert: document.getElementById("btn-convert"),
    btnDownloadDoc: document.getElementById("btn-download-doc"),
    btnPrint: document.getElementById("btn-print"),
    wordCount: document.getElementById("word-count"),
    paper: document.getElementById("paper"),
  };

  const REFERENCE_HEADINGS = /^(referencias|references|bibliograf[ií]a)$/i;

  // ---------- utilities ----------

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function inline(str) {
    let s = escapeHtml(str);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/(^|[^\w])_([^_]+)_(?!\w)/g, "$1<em>$2</em>");
    return s;
  }

  function wordCount(str) {
    const trimmed = str.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function titleCaseForStorage(str) {
    // We keep the user's own casing (APA 7 title case applies mainly to
    // reference titles, which we do not rewrite automatically) —
    // headings are rendered exactly as typed.
    return str;
  }

  // ---------- block splitting ----------

  function splitBlocks(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let buffer = [];

    function flush() {
      if (buffer.length) {
        blocks.push(buffer.join("\n"));
        buffer = [];
      }
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // fenced code block: capture everything up to the closing ``` as
      // a single block, ignoring blank lines / headings inside it
      if (/^\s*```/.test(line)) {
        flush();
        const codeLines = [line];
        idx++;
        while (idx < lines.length && !/^\s*```\s*$/.test(lines[idx])) {
          codeLines.push(lines[idx]);
          idx++;
        }
        if (idx < lines.length) codeLines.push(lines[idx]); // closing fence
        blocks.push(codeLines.join("\n"));
        continue;
      }

      const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
      if (headingMatch) {
        flush();
        blocks.push(line);
        continue;
      }
      if (line.trim() === "") {
        flush();
        continue;
      }
      buffer.push(line);
    }
    flush();
    return blocks;
  }

  // ---------- markdown -> APA HTML ----------

  function convert(mdText, meta) {
    const blocks = splitBlocks(mdText);
    let bodyHtml = "";
    let refsHtml = "";
    let inReferences = false;
    let refsHeadingLevel = null;
    let autoTitle = null;
    let sawFirstH1 = false;
    apaTableCounter = 0; // reiniciar la numeración de tablas en cada conversión

    for (const block of blocks) {
      const headingMatch = /^(#{1,6})\s+(.*)$/.exec(block);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();

        if (level === 1 && !sawFirstH1) {
          sawFirstH1 = true;
          autoTitle = text;
          continue; // reserved for the title page
        }

        const apaLevel = level - 1; // ## -> 1, ### -> 2, ... ###### -> 5
        const isRefsHeading = REFERENCE_HEADINGS.test(text);

        if (isRefsHeading) {
          inReferences = true;
          refsHeadingLevel = level;
          refsHtml += `<p class="apa-refs-title">${escapeHtml(text)}</p>\n`;
          continue;
        }

        if (inReferences && level <= refsHeadingLevel) {
          inReferences = false;
        }

        const target = inReferences ? "refs" : "body";
        const html = headingHtml(apaLevel, text);
        if (target === "refs") refsHtml += html; else bodyHtml += html;
        continue;
      }

      // non-heading block
      const target = inReferences ? "refs" : "body";
      const html = blockHtml(block, inReferences);
      if (target === "refs") refsHtml += html; else bodyHtml += html;
    }

    return { bodyHtml, refsHtml, autoTitle };
  }

  function headingHtml(apaLevel, text) {
    const t = inline(text);
    switch (apaLevel) {
      case 1:
        return `<p class="apa-h1">${t}</p>\n`;
      case 2:
        return `<p class="apa-h2">${t}</p>\n`;
      case 3:
        return `<p class="apa-h3">${t}</p>\n`;
      case 4:
        return `<p class="apa-h4">${t}. <span class="apa-run"></span></p>\n`;
      case 5:
      default:
        return `<p class="apa-h5">${t}. <span class="apa-run"></span></p>\n`;
    }
  }

  function blockHtml(block, inReferences) {
    const lines = block.split("\n");

    // fenced code block ( ```lang ... ``` )
    if (isCodeBlock(lines)) {
      return codeBlockHtml(lines);
    }

    // table (GFM: fila con | seguida de fila separadora ---|---)
    if (isTableBlock(lines)) {
      return tableBlockHtml(lines);
    }

    // blockquote
    if (lines.every((l) => /^\s*>/.test(l))) {
      const text = lines.map((l) => l.replace(/^\s*>\s?/, "")).join(" ").trim();
      if (wordCount(text) >= 40) {
        return `<p class="apa-blockquote">${inline(text)}</p>\n`;
      }
      return `<p class="apa-p">\u201C${inline(text)}\u201D</p>\n`;
    }

    // list
    const bulletLines = lines.filter((l) => /^\s*[-*]\s+/.test(l));
    const numberLines = lines.filter((l) => /^\s*\d+[.)]\s+/.test(l));
    if (bulletLines.length === lines.length && lines.length > 0) {
      const items = lines
        .map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`)
        .join("");
      return `<ul class="apa-list">${items}</ul>\n`;
    }
    if (numberLines.length === lines.length && lines.length > 0) {
      const items = lines
        .map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`)
        .join("");
      return `<ol class="apa-list">${items}</ol>\n`;
    }

    // plain paragraph
    const text = lines.join(" ").trim();
    if (!text) return "";
    if (inReferences) {
      return `<p class="apa-ref">${inline(text)}</p>\n`;
    }
    return `<p class="apa-p">${inline(text)}</p>\n`;
  }

  // ---------- fenced code blocks ----------

  function isCodeBlock(lines) {
    return lines.length >= 1 && /^\s*```/.test(lines[0]);
  }

  function codeBlockHtml(lines) {
    const langMatch = /^\s*```\s*([\w+-]*)\s*$/.exec(lines[0]);
    const lang = langMatch ? langMatch[1] : "";

    let content = lines.slice(1);
    if (content.length && /^\s*```\s*$/.test(content[content.length - 1])) {
      content = content.slice(0, -1);
    }

    const codeText = escapeHtml(content.join("\n"));
    const langClass = lang ? ` class="lang-${escapeHtml(lang)}"` : "";

    return `
      <div class="apa-code-block">
        <pre class="apa-code"><code${langClass}>${codeText}</code></pre>
      </div>\n`;
  }

  // ---------- tables (GFM + convención "Tabla:" / "Nota:") ----------

  let apaTableCounter = 0;

  function isTableSeparatorRow(line) {
    return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line || "");
  }

  function parseTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function isTableBlock(lines) {
    return lines.length >= 2 && lines[0].includes("|") && isTableSeparatorRow(lines[1]);
  }

  function tableBlockHtml(lines) {
    const header = parseTableRow(lines[0]);
    const rows = [];
    let i = 2;
    while (i < lines.length && lines[i].includes("|")) {
      rows.push(parseTableRow(lines[i]));
      i++;
    }

    let title = "";
    let note = "";
    if (i < lines.length && /^\s*(Tabla|Table)\s*:/i.test(lines[i])) {
      title = lines[i].replace(/^\s*(Tabla|Table)\s*:/i, "").trim();
      i++;
    }
    if (i < lines.length && /^\s*(Nota|Note)\s*:/i.test(lines[i])) {
      note = lines[i].replace(/^\s*(Nota|Note)\s*:/i, "").trim();
      i++;
    }

    return renderApaTable({ header, rows, title, note });
  }

  function renderApaTable({ header, rows, title, note }) {
    apaTableCounter++;
    const thead = `<tr>${header.map((h) => `<th>${inline(h)}</th>`).join("")}</tr>`;
    const tbody = rows
      .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
      .join("");

    return `
      <div class="apa-table-block">
        <p class="apa-table-number">Tabla ${apaTableCounter}</p>
        ${title ? `<p class="apa-table-title">${inline(title)}</p>` : ""}
        <table class="apa-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
        ${note ? `<p class="apa-table-note"><em>Nota.</em> ${inline(note)}</p>` : ""}
      </div>\n`;
  }

  // ---------- title page ----------

  function titlePageHtml(meta) {
    const rows = [meta.title];
    return `
      <div class="apa-titlepage">
        <p class="apa-line apa-title">${escapeHtml(meta.title || "Título del trabajo")}</p>
        <div class="apa-spacer"></div>
        <p class="apa-line">${escapeHtml(meta.author || "Nombre del autor o autora")}</p>
        <p class="apa-line">${escapeHtml(meta.affil || "Afiliación")}</p>
        <p class="apa-line">${escapeHtml(meta.course || "Curso")}</p>
        <p class="apa-line">${escapeHtml(meta.instructor || "Nombre del profesor o profesora")}</p>
        <p class="apa-line">${escapeHtml(meta.date || "Fecha de entrega")}</p>
      </div>
    `;
  }

  // ---------- read metadata from form ----------

  function readMeta() {
    const paperType = document.querySelector('input[name="paper-type"]:checked').value;
    return {
      title: els.title.value.trim(),
      author: els.author.value.trim(),
      affil: els.affil.value.trim(),
      course: els.course.value.trim(),
      instructor: els.instructor.value.trim(),
      date: els.date.value.trim(),
      paperType,
    };
  }

  // ---------- render ----------

  let lastRenderedHtml = "";
  let lastMeta = null;

  function render() {
    const raw = els.mdInput.value;
    const meta = readMeta();
    const { bodyHtml, refsHtml, autoTitle } = convert(raw, meta);

    if (!meta.title && autoTitle) meta.title = autoTitle;
    lastMeta = meta;

    if (!raw.trim()) {
      els.paper.className = "paper paper--empty";
      els.paper.innerHTML = `<p class="paper__hint">Tu manuscrito formateado aparecerá aquí. Completa los datos de la izquierda, pega tu texto y pulsa «Convertir a APA 7».</p>`;
      els.btnDownloadDoc.disabled = true;
      els.btnPrint.disabled = true;
      return;
    }

    const html = `
      ${titlePageHtml(meta)}
      <hr class="apa-pagebreak">
      <div class="apa-body">
        ${bodyHtml}
        ${refsHtml}
      </div>
    `;

    els.paper.className = "paper";
    els.paper.innerHTML = html;
    lastRenderedHtml = html;
    els.btnDownloadDoc.disabled = false;
    els.btnPrint.disabled = false;
  }

  // ---------- word count live ----------

  function updateWordCount() {
    const n = wordCount(els.mdInput.value);
    els.wordCount.textContent = `${n} ${n === 1 ? "palabra" : "palabras"}`;
  }

  // ---------- .doc export (Word-compatible HTML) ----------

  function slug(str) {
    return (str || "trabajo-apa7")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "trabajo-apa7";
  }

  function downloadDoc() {
    if (!lastRenderedHtml) return;

    const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <title>${escapeHtml(lastMeta.title || "Trabajo APA 7")}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 { size: 8.5in 11in; margin: 1in; }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 200%; color: #000; }
        p { margin: 0; line-height: 200%; }
        .apa-titlepage { text-align: center; }
        .apa-title { font-weight: bold; }
        .apa-spacer { height: 48pt; }
        .apa-h1 { text-align: center; font-weight: bold; }
        .apa-h2 { text-align: left; font-weight: bold; }
        .apa-h3 { text-align: left; font-weight: bold; font-style: italic; }
        .apa-h4 { text-indent: 0.5in; font-weight: bold; }
        .apa-h5 { text-indent: 0.5in; font-weight: bold; font-style: italic; }
        .apa-p { text-indent: 0.5in; text-align: left; }
        .apa-blockquote { margin-left: 0.5in; text-align: left; }
        .apa-refs-title { text-align: center; font-weight: bold; mso-special-character: pagebreak; break-before: page; }
        .apa-ref { text-indent: -0.5in; margin-left: 0.5in; text-align: left; }
        .apa-list { margin-left: 0.75in; }
        .apa-pagebreak { mso-special-character: pagebreak; break-before: page; border: none; }
        .apa-table-block { margin-top: 24pt; page-break-inside: avoid; }
        .apa-table-number { font-weight: bold; text-indent: 0; }
        .apa-table-title { font-style: italic; text-indent: 0; margin-bottom: 6pt; }
        .apa-table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        .apa-table th, .apa-table td { padding: 4pt 8pt; text-align: left; vertical-align: top; border: none; mso-border-alt: none; }
        .apa-table thead tr { border-top: 1.5pt solid #000; border-bottom: 1pt solid #000; }
        .apa-table tbody tr { border-bottom: none; }
        .apa-table tbody tr:last-child { border-bottom: 1.5pt solid #000; }
        .apa-table-note { font-size: 10.5pt; text-indent: 0; margin-top: 6pt; }
        .apa-code-block { margin-top: 24pt; }
        pre.apa-code { font-family: 'Courier New', Consolas, monospace; font-size: 10pt; line-height: 140%; text-align: left; text-indent: 0; border: 1pt solid #000; padding: 10pt 12pt; margin: 0; white-space: pre-wrap; }
      </style>
      </head>
      <body>
      <div class="Section1">
        ${lastRenderedHtml}
      </div>
      </body>
      </html>`;

    const blob = new Blob(["\ufeff", docHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(lastMeta.title)}-apa7.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------- sample text ----------

  const SAMPLE = `# El efecto del sueño en el rendimiento académico

## Introducción

La relación entre el descanso y el desempeño escolar ha sido objeto de numerosos estudios en las últimas dos décadas. **Este trabajo** examina la evidencia disponible sobre cómo la privación de sueño afecta la memoria, la atención y el rendimiento en evaluaciones.

Diversos autores coinciden en que la falta de sueño reduce la capacidad de consolidación de la memoria a largo plazo, un proceso que ocurre principalmente durante las fases profundas del sueño y que resulta indispensable para el aprendizaje significativo, la retención de conceptos complejos y la transferencia de conocimientos entre distintas áreas del currículo escolar, según se detalla a continuación.

### Metodología

Se revisaron 12 estudios publicados entre 2015 y 2024 en bases de datos indexadas.

#### Criterios de inclusión

Solo se consideraron estudios con muestras mayores a 100 participantes.

\`\`\`
enable
configure terminal
hostname S1
interface vlan1
ip address 192.168.1.11 255.255.255.0
no shutdown
\`\`\`

| Estudio | Muestra | Horas de sueño |
|---------|---------|-----------------|
| Curcio et al. (2006) | 142 | 6.2 |
| Walker (2017) | 310 | 7.1 |
Tabla: Resumen de los estudios revisados
Nota: Las horas de sueño corresponden al promedio reportado por los participantes.

## Resultados

Los hallazgos muestran una correlación negativa entre las horas de sueño y el número de errores en pruebas de atención sostenida.

## Referencias

Walker, M. P. (2017). *Why we sleep: Unlocking the power of sleep and dreams*. Scribner.

Curcio, G., Ferrara, M., & De Gennaro, L. (2006). Sleep loss, learning capacity and academic performance. *Sleep Medicine Reviews, 10*(5), 323-337.
`;

  // ---------- events ----------

  els.mdInput.addEventListener("input", updateWordCount);

  els.btnSample.addEventListener("click", () => {
    els.mdInput.value = SAMPLE;
    els.title.value = "";
    updateWordCount();
    render();
  });

  els.btnClear.addEventListener("click", () => {
    els.mdInput.value = "";
    updateWordCount();
    render();
  });

  els.fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      els.mdInput.value = String(reader.result);
      updateWordCount();
      render();
    };
    reader.readAsText(file, "utf-8");
  });

  els.btnConvert.addEventListener("click", render);
  els.btnDownloadDoc.addEventListener("click", downloadDoc);
  els.btnPrint.addEventListener("click", () => window.print());

  updateWordCount();
})();
