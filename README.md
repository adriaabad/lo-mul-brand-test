# Lo Mul — Exploració visual

Aplicació web estàtica per presentar tipografies, icones i referents de llenguatge gràfic d’un en un, recollir les reaccions del client i conservar el progrés localment. Cada resposta se selecciona, es pot completar amb un comentari i es confirma explícitament amb «Següent».

No necessita cap framework, instal·lació ni procés de compilació. Funciona en un hosting convencional i a GitHub Pages.

## 1. Executar el projecte localment

Perquè el navegador carregui tots els fitxers de manera consistent, serveix la carpeta amb un servidor local en lloc d’obrir `index.html` directament.

Amb Node.js (sense instal·lar dependències):

```bash
node scripts/serve.mjs
```

Després obre `http://127.0.0.1:4173`.

Alternativament, amb Python:

```bash
python -m http.server 8080
```

Després obre `http://localhost:8080`.

També pots utilitzar qualsevol servidor estàtic, per exemple `npx serve .`.

## 2. Afegir o eliminar Google Fonts

Edita `data/fonts.js`. L’ordre de l’array és l’ordre del test, llevat que `randomizeWithinSections` estigui activat.

```js
{
  id: "fraunces",
  name: "Fraunces",
  family: "Fraunces",
  weights: [400, 600],
  googleFont: true,
  category: "serif"
}
```

- `id` ha de ser únic i estable.
- `family` ha de coincidir amb el nom de Google Fonts.
- `weights` indica els pesos que es carregaran automàticament.
- Per eliminar una font, elimina el seu objecte de l’array.

## 3. Afegir icones

1. Copia el fitxer a `assets/icons/`. S’accepten SVG, PNG, WEBP i JPG.
2. Afegeix una entrada a `data/icons.js`:

```js
{
  id: "icon-05",
  file: "assets/icons/icon-05.svg",
  name: "Icona 05",
  tags: ["organic", "manual"]
}
```

Les rutes són relatives, de manera que funcionen també quan GitHub Pages publica el projecte en un subdirectori.

## 4. Afegir referents de llenguatge gràfic

1. Copia el fitxer a `assets/graphics/`.
2. Afegeix una entrada a `data/graphics.js`:

```js
{
  id: "graphic-15",
  file: "assets/graphics/graphic-15.png",
  name: "Nom del referent",
  tags: ["editorial", "fotografia", "contrast"]
}
```

El nom i els tags només apareixen quan l’usuari prem «Veure informació».

## 5. Configurar l’aplicació i Supabase

Edita `config.js`:

```js
window.LO_MUL_CONFIG = {
  SUPABASE_URL: "https://EL-TEU-PROJECTE.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "LA-TEVA-CLAU-PUBLICABLE",
  SUPABASE_ANON_KEY: "",
  PROJECT_ID: "lo-mul-brand-test",
  randomizeWithinSections: false
};
```

Utilitza exclusivament la clau `publishable` (`sb_publishable_...`). La clau `anon` antiga continua sent compatible, però no és necessària en projectes nous. **No posis mai una clau `secret` o `service_role` al frontend.**

Quan `randomizeWithinSections` és `true`, cada secció es barreja una sola vegada en crear la sessió. La seqüència queda desada a `localStorage` i es manté després de recarregar.

Si Supabase no està configurat, tota l’aplicació continua funcionant i la pantalla final permet exportar un JSON.

## 6. Base de dades i seguretat

La base de dades del projecte ja està creada a Supabase. Les taules `private.test_sessions` i `private.test_responses` tenen RLS activat i no concedeixen accés directe als rols del navegador.

El frontend només pot executar `public.submit_visual_test(jsonb)`. Aquesta funció valida el projecte, les dates, la mida del payload, els 48 elements esperats, els identificadors permesos i la correspondència entre valoració i puntuació abans de fer una inserció atòmica. El rol públic no pot llegir, editar ni eliminar resultats.

Per veure totes les respostes des de l’SQL Editor de Supabase:

```sql
select
  s.client_name,
  s.submitted_at,
  r.section,
  r.item_label,
  r.rating,
  r.score,
  r.comment
from private.test_sessions as s
join private.test_responses as r using (session_id)
order by s.submitted_at desc, r.section, r.item_id;
```

## 7. Publicar a GitHub Pages

1. Puja tots els fitxers a un repositori de GitHub.
2. A `Settings → Pages`, selecciona `Deploy from a branch`.
3. Selecciona la branca (`main`, habitualment) i la carpeta `/ (root)`.
4. Desa els canvis i espera que GitHub publiqui l’URL.

No hi ha rutes absolutes ni dependències de la ruta arrel del domini.

## 8. Publicar en un hosting convencional

Puja el contingut complet de la carpeta a la carpeta pública del teu hosting (`public_html`, `www` o equivalent). No cal PHP ni cap procés de build.

## 9. Consultar o exportar respostes

- **Sense Supabase:** a la pantalla final, prem «Exportar JSON».
- **Amb Supabase:** consulta `private.test_sessions` i `private.test_responses` des del Table Editor, l’SQL Editor o un backend amb credencials segures.
- Durant el test, l’estat es desa automàticament a `localStorage` amb una clau vinculada al `PROJECT_ID`.
- Per reiniciar manualment una prova durant el desenvolupament, elimina la clau `lo-mul-visual-test:lo-mul-brand-test:v2` des de les eines del navegador.

Cada resposta centralitzada conté la secció, l’identificador i el nom llegible de la proposta, la valoració numèrica, el comentari i la data. Per treballar els resultats conjuntament, exporta `test_sessions` i `test_responses` com a CSV des de Supabase i comparteix els fitxers en una conversa d’anàlisi.

## Estructura

```text
/
  index.html
  config.js
  config.example.js
  css/styles.css
  js/app.js
  js/storage.js
  js/supabase.js
  data/fonts.js
  data/icons.js
  data/graphics.js
  assets/icons/
  assets/graphics/
  scripts/serve.mjs
```
