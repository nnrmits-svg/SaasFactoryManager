-- Sprint A.1: Seed inicial de help_articles + faqs
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- Contenido base extraido del WORKFLOW.md. Le da al bot AI Fluya un knowledge base
-- consultable y navegable desde dia 1 (en lugar de solo lo hardcodeado en chat/route.ts).
--
-- Idempotente: usa ON CONFLICT (slug) DO UPDATE para categorias y articulos.
-- FAQs se borran y reinsertan en cada run (todavia no tienen UNIQUE constraint).

BEGIN;

-- ============================================================
-- 1) Categorias
-- ============================================================
INSERT INTO public.help_categories (slug, name, icon, order_index, is_active) VALUES
  ('proyectos', 'Proyectos', '📂', 1, TRUE),
  ('skills',    'Skills',    '🧩', 2, TRUE),
  ('costos',    'Costos',    '💰', 3, TRUE),
  ('tracking',  'Tracking',  '⏱️', 4, TRUE),
  ('agente',    'SF Agent',  '🤖', 5, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 2) Articulos
-- ============================================================
INSERT INTO public.help_articles (
  slug, category_id, title, excerpt, content,
  order_index, is_published, is_featured
) VALUES
(
  'que-es-factory-manager',
  (SELECT id FROM public.help_categories WHERE slug = 'proyectos'),
  '¿Qué es Factory Manager?',
  'Tu Business OS para gestionar una fabrica de software SaaS.',
  E'Factory Manager es el centro de control de tu fabrica de software. Te permite:\n\n- Ver todos tus proyectos SaaS en un solo dashboard\n- Monitorear cuanto tiempo y dinero invertis en cada uno\n- Sincronizar las "capacidades" (skills) entre un catalogo central y cada proyecto\n- Generar reportes de costo por hora\n\nEs un Business OS: no es para programar — es para *manejar* la fabrica. La parte tecnica la hace el **SF Agent**, un programa que corre en tu computadora y mantiene todo sincronizado con la nube.\n\nLas pantallas principales son:\n- **Portfolio** (/dashboard): la vista de tus proyectos\n- **Factory** (/factory): crear un proyecto nuevo desde una idea\n- **Skills** (/skills): catalogo de capacidades reutilizables\n- **Reports** (/reports): cuanto te cuesta cada cosa\n- **Settings** (/settings): configuracion personal y de cuentas conectadas',
  1, TRUE, TRUE
),
(
  'estados-de-skills',
  (SELECT id FROM public.help_categories WHERE slug = 'skills'),
  'Los 4 estados de un skill',
  'Synced, divergent, missing, external — que significa cada uno.',
  E'Cada skill instalado en un proyecto tiene un estado que ves como un puntito de color en el panel de skills:\n\n**🟢 Synced (verde)** — Todo en orden. El skill local esta exactamente igual al catalogo central. No hay nada que hacer.\n\n**🟡 Divergent (ambar)** — El archivo local del skill tiene cambios que NO estan en el catalogo. Probablemente alguien lo edito directo en este proyecto. Hay dos opciones para arreglar: o tocar **Re-sync** para volver al catalogo (perdes los cambios locales), o pushear los cambios al catalogo central desde el **SF Agent** (todos los proyectos los heredan).\n\n**🔴 Missing (rojo)** — El skill desaparecio del proyecto pero queda registrado. Probablemente se borro la carpeta sin querer. Para restaurar: en la terminal del proyecto, corres `git checkout HEAD -- .claude/skills/<nombre>/` y el watcher detecta el archivo de vuelta.\n\n**⚪ External (gris)** — Es un skill custom de ese proyecto especifico, no esta en el catalogo central. No hay nada que arreglar — es intencional.\n\nLa "huella digital" que compara local vs catalogo es un **hash** del directorio del skill. Si los hashes coinciden = synced. Si difieren = divergent.',
  1, TRUE, TRUE
),
(
  'arreglar-skill-divergent',
  (SELECT id FROM public.help_categories WHERE slug = 'skills'),
  'Como arreglar un skill divergent',
  'Volver el skill al catalogo o pushear tus cambios.',
  E'Un skill marcado **divergent** (ambar) tiene cambios locales que difieren del catalogo central. Hay tres caminos:\n\n**Opcion A — Volver al catalogo (descartar cambios locales)**\n1. Andate a /project/[nombre del proyecto]\n2. Localiza el skill en el panel de Skills instalados\n3. Toca Re-sync (cuando este disponible — hoy esta esperando wire-up con el Agent)\n\n**Opcion B — Pushear tus cambios al catalogo central**\nEsto solo lo podes hacer desde el SF Agent en la terminal del proyecto. Es para cuando vos *queres* que esos cambios sean la nueva version oficial:\n```\ncd ~/ProyectosIA/<proyecto>\nsf-agent push-skill <nombre-del-skill>\n```\n\n**Opcion C — Aceptar el divergent y no hacer nada**\nA veces el skill esta divergent intencionalmente (tenes una version custom solo para ese proyecto). En ese caso, ignorar el badge ambar.\n\nPara confirmar que se arreglo: refresca /project y deberia verse verde (synced) en menos de 1 segundo despues del Re-sync.',
  2, TRUE, FALSE
),
(
  'arreglar-skill-missing',
  (SELECT id FROM public.help_categories WHERE slug = 'skills'),
  'Como arreglar un skill missing',
  'Restaurar un skill que se borro del disco.',
  E'Un skill marcado **missing** (rojo) significa que la carpeta del skill ya no existe en el filesystem del proyecto, pero queda registrado en la base.\n\n**Como pasa esto:**\n- Borraste la carpeta `.claude/skills/<nombre>/` por error\n- Hiciste un git checkout a una rama vieja que no tenia el skill\n- Algun script de limpieza la elimino\n\n**Como restaurarlo:**\n```bash\ncd ~/ProyectosIA/<proyecto>\ngit checkout HEAD -- .claude/skills/<nombre>/\n```\n\nEsto trae el archivo de vuelta desde el ultimo commit. El watcher del SF Agent detecta el cambio en ~1 segundo y actualiza el estado a **synced** automaticamente.\n\nSi el skill nunca estuvo en git y se borro permanente, hay que **reinstalarlo** desde el catalogo central:\n```bash\nsf-agent install-skill <nombre>\n```\n\nNo te asustes con el rojo: la fila en la BD se preserva (no se borra), asi que el historial queda intacto.',
  3, TRUE, FALSE
),
(
  'crear-proyecto-nuevo',
  (SELECT id FROM public.help_categories WHERE slug = 'proyectos'),
  'Como crear un proyecto nuevo',
  'Wizard guiado con IA para empezar desde una idea.',
  E'Para crear un proyecto nuevo, andate a **/factory**. Ahi vas a encontrar un wizard de 7 pasos que te guia desde la idea hasta el bootstrap:\n\n1. **Nombre** del proyecto\n2. **Idea** en lenguaje natural ("una app para X")\n3. **Personajes** que la usan\n4. **Que problema resuelve** (el dolor)\n5. **Como se diferencia** (la unica)\n6. **Cuanto cobras** (el precio)\n7. **Orgs de GitHub** donde crear el repo\n\nEn cada paso, podes pedirle ayuda al **asistente IA del wizard** si no sabes que poner — te tira sugerencias basadas en lo que ya respondiste.\n\nAl terminar, el **SF Agent** recibe el job y crea el proyecto en disco con todo el scaffolding listo. Vas a ver el estado pasar de "pending" → "creating" → "created" en /dashboard.\n\nSi algo falla, queda marcado como "failed" y podes reintentar.\n\n**Nota:** el Agent tiene que estar online para que el wizard termine la creacion. Si esta offline, el job queda en cola.',
  2, TRUE, TRUE
),
(
  'entender-reportes-costo',
  (SELECT id FROM public.help_categories WHERE slug = 'costos'),
  'Como leer los reportes de costo',
  'Tokens, dolares, dolares por hora — todo lo que necesitas saber.',
  E'En **/reports** vas a ver una tabla con un fila por proyecto y estas columnas:\n\n- **Proyecto** — nombre\n- **Status** — active / archived / paused\n- **Tokens (in / out / cached)** — input + output + cached del modelo de IA\n- **$ Total** — costo en dolares de las sesiones de Claude Code\n- **$/hora** — costo dividido por horas humanas trabajadas (work_sessions)\n- **Modelo mas usado** — Sonnet, Opus, Haiku, etc.\n- **Ultima sesion** — fecha de la ultima actividad\n\nPodes filtrar por modelo, mes o proyecto especifico.\n\n**Como se calcula $/hora**: tomamos el costo total del proyecto y lo dividimos por los minutos de work_sessions registradas. Si trabajas 2 horas y la IA te costo $4, tu $/hora es $2.\n\n**Tip:** si ves un proyecto con $/hora muy alto, probablemente tuviste una sesion larga que no quedo registrada como work_session (te olvidaste de prender el tracking). Si esta muy bajo, capaz quedo un work_session inflado de pruebas viejas.\n\nLa columna **Ultima sesion** usa `ended_at` (cuando termino la actividad), no `started_at`. Asi reflejas la actividad real incluso cuando dejas Claude Code abierto por dias.',
  1, TRUE, TRUE
),
(
  'que-es-el-sf-agent',
  (SELECT id FROM public.help_categories WHERE slug = 'agente'),
  '¿Que es el SF Agent?',
  'El programa que mantiene la fabrica sincronizada.',
  E'El **SF Agent** (SaaS Factory Agent) es un programa que corre en tu computadora y hace dos cosas principales:\n\n1. **Vigila tus proyectos** — observa cambios en el filesystem (skills modificados, eliminados, creados) y los pushea a la base de datos central\n2. **Ejecuta comandos** — cuando vos pedis algo desde el Manager web (sincronizar, aplicar skill, crear proyecto), el Agent lo recibe y lo ejecuta localmente\n\n**Por que existe:** el Manager corre en Vercel (la nube), no tiene acceso a tu disco. El Agent es el puente.\n\n**Como saber si esta online:** en /project/[nombre] hay un panel "Agent · <maquina>" con un timestamp tipo "Hace 5s". Si el timestamp es muy viejo (mas de 1 minuto), esta offline.\n\n**Para despertarlo:** abrir la terminal donde lo dejaste corriendo, o re-correrlo con `sf-agent start` desde la raiz del proyecto.\n\n**Comandos que ejecuta:**\n- `scan` — escanea proyectos locales\n- `sync` — pushea/pullea con catalogo central\n- `apply-skill` — instala un skill en un proyecto\n- `push-projects` — sube cambios pendientes\n- `create-project` — bootstrap inicial\n\nSi el Agent esta offline, las acciones en el Manager quedan en cola hasta que vuelva.',
  1, TRUE, TRUE
),
(
  'auto-commit-tracking',
  (SELECT id FROM public.help_categories WHERE slug = 'tracking'),
  'Auto-Commit Tracking',
  'Modo automatico que commitea cada 30 segundos.',
  E'El **Auto-Commit Tracking** es un modo que detecta cambios en tu codigo y los commitea automaticamente cada 30 segundos. Sirve para no perder trabajo y para medir tiempo real invertido.\n\n**Donde se enciende:** en /project/[nombre], hay un panel "Auto-Commit Tracking" con un boton "Start Tracking".\n\n**Que hace cuando esta activo:**\n- Pone un punto verde pulsante en la UI\n- Cada 30s revisa si hubo cambios\n- Si los hubo, crea un commit con mensaje `wip: <hostname> <timestamp>`\n- Aumenta el contador de commits del proyecto\n- Las sesiones quedan registradas en `work_sessions` para calcular $/hora\n\n**Cuando apagarlo:**\n- Cuando termines de trabajar y vas a hacer un commit "limpio" con mensaje propio\n- Cuando estes haciendo refactor grande y no querias commits cada 30s\n\n**Por que es util:**\n- Si tu maquina crashea o se cierra Claude Code, no perdes el ultimo trabajo\n- Los reportes de $/hora son mas precisos\n- Tenes timestamps reales de cuando tocaste cada cosa\n\n**Limitacion actual:** el toggle Start/Stop esta deshabilitado en la UI esperando el wire-up final con el Agent. Hoy se prende solo cuando el Agent detecta actividad.',
  1, TRUE, FALSE
),
(
  'sincronizar-con-catalogo',
  (SELECT id FROM public.help_categories WHERE slug = 'skills'),
  'Sincronizar un proyecto con el catalogo central',
  'Volver tus skills locales identicos al catalogo.',
  E'Sincronizar = traer los skills del catalogo central al proyecto local. Es la operacion inversa de "pushear cambios" (que va del proyecto al catalogo).\n\n**Cuando sincronizar:**\n- Despues de actualizar un skill en el catalogo y querer propagarlo\n- Cuando el badge dice "divergent" y queres descartar los cambios locales\n- Al onboardear un proyecto viejo que tiene skills desactualizados\n\n**Como funciona:**\n1. El Agent recibe el comando `sync` para el proyecto X\n2. Compara hashes locales vs hashes del catalogo\n3. Para cada skill: si no esta synced, sobreescribe el local con el del catalogo\n4. Actualiza `last_synced_at` en la BD\n5. El Manager refleja los nuevos estados\n\n**Que no hace:**\n- No borra skills custom (external) — esos se quedan tranquilos\n- No toca codigo fuera de `.claude/skills/`\n- No commitea automaticamente — los cambios quedan en el working tree para que vos los revises\n\n**Despues de sincronizar**, te recomiendo hacer un commit manual con mensaje claro: `chore: sync skills with catalog`.',
  4, TRUE, FALSE
),
(
  'agente-offline',
  (SELECT id FROM public.help_categories WHERE slug = 'agente'),
  'El SF Agent esta offline, ¿que hago?',
  'Como revivirlo y por que se cae.',
  E'Si en /project/[nombre] el panel "Agent" muestra **offline** o un timestamp muy viejo (mas de 1 minuto), el Agent dejo de mandar heartbeats.\n\n**Causas comunes:**\n- Cerraste la terminal donde estaba corriendo\n- Tu Mac se durmio y el proceso se pauso\n- Crash del proceso por alguna excepcion\n- Cambiaste de red y perdio conexion con Supabase\n\n**Como revivirlo:**\n```bash\ncd ~/ProyectosIA/<proyecto>\nsf-agent start\n```\n\nDeberia volver online en ~5 segundos. Refresca /project y el panel deberia decir "Hace 2s".\n\n**Si no responde:**\n1. Revisa que no haya otro proceso colgado: `ps aux | grep sf-agent` y matarlo si lo encontras (`kill -9 <pid>`)\n2. Revisa los logs en `~/.sf-agent/logs/<hostname>.log`\n3. Si todo lo demas falla, reinstala el Agent con `sf-agent install`\n\n**Mientras esta offline:**\n- Las acciones del Manager (sync, apply-skill, create-project) quedan en cola\n- Cuando vuelva online, las ejecuta en orden\n- Los watchers no detectan cambios del filesystem hasta que vuelva',
  2, TRUE, FALSE
)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  order_index = EXCLUDED.order_index,
  is_published = EXCLUDED.is_published,
  is_featured = EXCLUDED.is_featured;

-- ============================================================
-- 3) FAQs — wipe + reinsert (no hay UNIQUE constraint todavia)
-- ============================================================
DELETE FROM public.faqs WHERE category_id IN (SELECT id FROM public.help_categories);

INSERT INTO public.faqs (category_id, question, answer, order_index, is_active) VALUES
((SELECT id FROM public.help_categories WHERE slug = 'skills'),    '¿Que significa que un skill este "divergent"?', 'Significa que el archivo local del skill tiene cambios que no estan en el catalogo central. Probablemente alguien lo edito directo en el proyecto. Para arreglarlo: toca Re-sync para volver al catalogo, o pushea los cambios al catalogo desde el SF Agent.', 1, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'skills'),    '¿Que significa que un skill este "missing"?', 'Significa que la carpeta del skill ya no existe en el filesystem del proyecto, pero queda registrado en la base. Probablemente alguien la borro por error. Para restaurar: corre git checkout HEAD -- .claude/skills/<nombre>/ en la terminal del proyecto.', 2, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'skills'),    '¿Por que un skill aparece como "external"?', 'Es un skill custom de ese proyecto especifico, no existe en el catalogo central. No hay nada que arreglar — es intencional. Si lo quisieras compartir con otros proyectos, podes promoverlo al catalogo desde el SF Agent.', 3, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'skills'),    '¿Cuantos skills puedo tener instalados?', 'No hay limite tecnico. Hoy el catalogo tiene 20+ skills oficiales. Vos podes agregar skills custom (external) por proyecto sin restriccion.', 4, TRUE),

((SELECT id FROM public.help_categories WHERE slug = 'proyectos'), '¿Como creo un proyecto nuevo?', 'Andate a /factory y completa el wizard de 7 pasos. Cuando termines, el SF Agent crea el proyecto en disco automaticamente. El status pasa de pending a creating a created.', 1, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'proyectos'), '¿Puedo eliminar un proyecto?', 'Todavia no esta habilitado desde la UI. Por ahora hay que hacerlo manualmente: borrar la fila en projects desde Supabase + eliminar la carpeta del proyecto del disco. Esta en roadmap (sprint B).', 2, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'proyectos'), '¿Por que no aparece mi proyecto en /dashboard?', 'Tres posibilidades: (1) Tenes un filtro activo — chequea la barra superior, (2) Esta archivado — andate a Settings → Archivados, (3) Lo creaste con otra cuenta — verifica que estas logueado con el usuario correcto.', 3, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'proyectos'), '¿Cuantos proyectos puedo tener?', 'No hay limite tecnico. Los costos crecen linealmente con el uso de IA en cada proyecto (cada uno tiene sus claude_sessions registradas).', 4, TRUE),

((SELECT id FROM public.help_categories WHERE slug = 'costos'),    '¿Como veo cuanto gaste este mes?', 'Andate a /reports y filtra por el mes que querias ver. La columna "$ Total" suma los costos de claude_sessions de ese periodo. Es por proyecto.', 1, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'costos'),    '¿Que es el $/hora?', 'Es el costo en dolares de la IA dividido por las horas humanas trabajadas (work_sessions). Si gastaste $20 en 4 horas, tu $/hora es $5. Es una metrica de eficiencia.', 2, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'costos'),    '¿Por que un proyecto tiene $/hora muy alto?', 'Probablemente tuviste sesiones largas de Claude que no se registraron como work_sessions (te olvidaste de prender el tracking, o el Agent estaba offline). El denominador es chico y el ratio se infla.', 3, TRUE),

((SELECT id FROM public.help_categories WHERE slug = 'tracking'),  '¿Que es el Auto-Commit Tracking?', 'Es un modo que cada 30 segundos commitea automaticamente tus cambios con mensaje "wip: <maquina> <fecha>". Sirve para no perder trabajo y para que los reportes de $/hora sean precisos.', 1, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'tracking'),  '¿Como prendo el tracking?', 'En /project/[nombre] hay un panel "Auto-Commit Tracking" con un boton Start. Hoy esta deshabilitado en la UI esperando wire-up con el Agent — se prende automatico cuando detecta actividad.', 2, TRUE),

((SELECT id FROM public.help_categories WHERE slug = 'agente'),    '¿Que es el SF Agent?', 'Es un programa que corre en tu computadora y mantiene tus proyectos en sincronia con la nube. Hace dos cosas: (1) vigila cambios en tus skills y los pushea a la base, (2) ejecuta comandos desde el Manager (sync, apply-skill, etc.).', 1, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'agente'),    'El Agent esta offline, ¿que hago?', 'Abri una terminal y corre: cd ~/ProyectosIA/<proyecto> && sf-agent start. Deberia volver online en ~5 segundos. Si no responde, revisa los logs en ~/.sf-agent/logs/.', 2, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'agente'),    '¿Que pasa si dos maquinas commitean a main al mismo tiempo?', 'Hoy ese caso genera conflictos (ya lo tenemos como bug conocido del Agent). La solucion en curso: que cada maquina commitee a su propia rama agent/<hostname> y abra PR a main. Mientras tanto: pausa el Agent en una maquina cuando trabajas activo en la otra.', 3, TRUE),
((SELECT id FROM public.help_categories WHERE slug = 'agente'),    '¿Que hago si veo un commit "wip" que no entiendo?', 'Los commits "wip: <hostname> <fecha>" los crea el SF Agent automaticamente cuando esta el tracking activo. Significan "work in progress, no es una version final". Podes squashearlos o dejarlos como historial.', 4, TRUE);

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT slug, name, order_index FROM help_categories ORDER BY order_index;
-- SELECT slug, title, is_published, is_featured FROM help_articles ORDER BY order_index;
-- SELECT category_id, question FROM faqs ORDER BY order_index LIMIT 20;
-- ============================================================
