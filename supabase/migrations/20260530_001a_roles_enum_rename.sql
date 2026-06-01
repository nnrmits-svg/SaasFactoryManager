-- ============================================================================
-- Sprint A · Mig 001a — Rename de valores del enum user_role + add 'comercial'
-- ----------------------------------------------------------------------------
-- ⚠️ SEPARADA de 001b a propósito: en PostgreSQL un valor agregado con
--    ALTER TYPE ... ADD VALUE NO puede USARSE en la misma transacción en que
--    se agrega. Como el backfill de 001b hace UPDATE ... role='comercial',
--    el ADD VALUE debe COMMITEAR primero (esta migración), y recién después
--    correr 001b. Aplicar en orden: 001a → 001b.
--
-- Los RENAME VALUE preservan el OID de cada label, por lo que TODAS las
-- referencias almacenadas que usan esos valores se actualizan solas:
--   · column defaults  (profiles.role DEFAULT 'client' → 'cliente')
--   · RLS policies con literales ('operator'::user_role → 'dev', etc.)
-- NO así los cuerpos de funciones SQL (texto) → se arreglan en 001b.
-- ============================================================================

-- Valores actuales: { founder, operator, client }  →  target: + leader/dev/cliente/comercial
ALTER TYPE user_role RENAME VALUE 'founder'  TO 'leader';
ALTER TYPE user_role RENAME VALUE 'operator' TO 'dev';
ALTER TYPE user_role RENAME VALUE 'client'   TO 'cliente';

-- Valor nuevo (no existía en el enum legacy)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'comercial' AFTER 'dev';
