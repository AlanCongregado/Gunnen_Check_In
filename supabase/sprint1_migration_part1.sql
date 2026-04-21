-- Sprint 1 Migration — PARTE 1 de 2
-- ⚠️  Ejecutar ESTA parte primero, sola, en el SQL Editor de Supabase.
--    Esperar que termine antes de ejecutar sprint1_migration_part2.sql
--
-- Por qué en dos partes: PostgreSQL no permite usar un nuevo valor de enum
-- en la misma transacción donde fue creado.

alter type public.user_role add value if not exists 'admin';
