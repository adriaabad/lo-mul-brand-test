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
  SUPABASE_ANON_KEY: "LA-TEVA-CLAU-ANON-PUBLICA",
  PROJECT_ID: "lo-mul-brand-test",
  randomizeWithinSections: false
};
```

Utilitza exclusivament la clau pública `anon`. **No posis mai la clau `service_role` al frontend.**

Quan `randomizeWithinSections` és `true`, cada secció es barreja una sola vegada en crear la sessió. La seqüència queda desada a `localStorage` i es manté després de recarregar.

Si Supabase no està configurat, tota l’aplicació continua funcionant i la pantalla final permet exportar un JSON.

## 6. SQL per crear les taules i la política RLS

Executa aquest SQL a l’SQL Editor de Supabase. Crea dues taules, activa Row Level Security i exposa una única funció transaccional d’inserció. Els rols públics no reben permisos de lectura.

```sql
create table if not exists public.test_sessions (
  session_id uuid primary key,
  project_id text not null,
  client_name text,
  created_at timestamptz not null,
  completed_at timestamptz not null,
  user_agent text
);

create table if not exists public.test_responses (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.test_sessions(session_id) on delete cascade,
  section text not null check (section in ('fonts', 'icons', 'graphics')),
  item_id text not null,
  item_label text not null,
  rating text not null check (rating in ('love', 'interesting', 'not_for_me', 'dislike')),
  score smallint not null check (score between 0 and 3),
  comment text not null default '',
  answered_at timestamptz not null,
  unique (session_id, section, item_id)
);

alter table public.test_sessions enable row level security;
alter table public.test_responses enable row level security;

revoke all on public.test_sessions from anon, authenticated;
revoke all on public.test_responses from anon, authenticated;

create or replace function public.submit_visual_test(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.test_sessions (
    session_id,
    project_id,
    client_name,
    created_at,
    completed_at,
    user_agent
  ) values (
    (payload->>'session_id')::uuid,
    payload->>'project_id',
    nullif(payload->>'client_name', ''),
    (payload->>'created_at')::timestamptz,
    (payload->>'completed_at')::timestamptz,
    payload->>'user_agent'
  );

  insert into public.test_responses (
    session_id,
    section,
    item_id,
    item_label,
    rating,
    score,
    comment,
    answered_at
  )
  select
    (payload->>'session_id')::uuid,
    response->>'section',
    response->>'item_id',
    response->>'item_label',
    response->>'rating',
    (response->>'score')::smallint,
    coalesce(response->>'comment', ''),
    (response->>'answered_at')::timestamptz
  from jsonb_array_elements(payload->'responses') as response;
end;
$$;

revoke all on function public.submit_visual_test(jsonb) from public;
grant execute on function public.submit_visual_test(jsonb) to anon, authenticated;
```

La funció `security definer` fa una única inserció atòmica. Les taules no són llegibles ni modificables pels visitants i no hi ha cap política `SELECT`, `UPDATE` o `DELETE`. Per consultar els resultats, utilitza el Table Editor de Supabase amb un compte autoritzat o fes una consulta des d’un entorn servidor segur.

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
- **Amb Supabase:** consulta `test_sessions` i `test_responses` des del Table Editor o des d’un backend amb credencials segures.
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
