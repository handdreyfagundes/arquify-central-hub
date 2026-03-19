
CREATE OR REPLACE FUNCTION public.get_schema_ddl()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result text := '';
  tbl record;
  col record;
  con record;
  enum_rec record;
  tbl_sql text;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Export custom enums
  FOR enum_rec IN
    SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  LOOP
    result := result || 'CREATE TYPE public.' || enum_rec.typname || ' AS ENUM (''' || replace(enum_rec.labels, ', ', ''', ''') || ''');' || E'\n\n';
  END LOOP;

  -- Export tables
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    tbl_sql := 'CREATE TABLE public.' || tbl.table_name || ' (' || E'\n';

    FOR col IN
      SELECT
        c.column_name,
        CASE
          WHEN c.data_type = 'USER-DEFINED' THEN 'public.' || c.udt_name
          WHEN c.data_type = 'ARRAY' THEN c.udt_name || '[]'
          WHEN c.character_maximum_length IS NOT NULL THEN c.data_type || '(' || c.character_maximum_length || ')'
          ELSE c.data_type
        END AS full_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = tbl.table_name
      ORDER BY c.ordinal_position
    LOOP
      tbl_sql := tbl_sql || '  ' || col.column_name || ' ' || col.full_type;
      IF col.is_nullable = 'NO' THEN
        tbl_sql := tbl_sql || ' NOT NULL';
      END IF;
      IF col.column_default IS NOT NULL THEN
        tbl_sql := tbl_sql || ' DEFAULT ' || col.column_default;
      END IF;
      tbl_sql := tbl_sql || ',' || E'\n';
    END LOOP;

    -- Primary key
    FOR con IN
      SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS cols
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = tbl.table_name AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY tc.constraint_name
    LOOP
      tbl_sql := tbl_sql || '  PRIMARY KEY (' || con.cols || '),' || E'\n';
    END LOOP;

    -- Remove trailing comma
    tbl_sql := rtrim(tbl_sql, E',\n') || E'\n';
    tbl_sql := tbl_sql || ');' || E'\n\n';
    result := result || tbl_sql;
  END LOOP;

  -- Foreign keys
  FOR con IN
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  LOOP
    result := result || 'ALTER TABLE public.' || con.table_name
      || ' ADD CONSTRAINT ' || con.constraint_name
      || ' FOREIGN KEY (' || con.column_name || ')'
      || ' REFERENCES ' || con.foreign_table_schema || '.' || con.foreign_table_name || '(' || con.foreign_column_name || ');'
      || E'\n';
  END LOOP;

  RETURN result;
END;
$function$;
