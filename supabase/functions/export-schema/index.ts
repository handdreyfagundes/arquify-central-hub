import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to query information_schema
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all tables
    const { data: tables, error: tablesError } = await adminClient.rpc("get_schema_ddl");

    if (tablesError) {
      // Fallback: query information_schema directly
      const { data: columns, error: colError } = await adminClient
        .from("information_schema.columns" as any)
        .select("*")
        .eq("table_schema", "public");

      if (colError) {
        // Use pg_catalog via raw SQL isn't available, build from known schema
        return new Response(JSON.stringify({ error: "Não foi possível gerar DDL: " + (colError?.message || tablesError.message) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Since we can't query information_schema directly via the client,
    // we'll build DDL from the database using a different approach
    // Query each table's structure using postgres metadata

    const schemaQuery = `
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position;
    `;

    const { data: colData, error: colErr } = await adminClient.rpc("exec_sql", { query: schemaQuery });

    // Since we can't use rpc for arbitrary SQL either, let's build from what we know
    // We'll query each table via the API to get structure
    
    // Alternative: use pg_tables and build manually
    // For now, let's return a pre-built schema based on the actual DB structure
    
    // Get all public table names
    const publicTables = [
      "workspaces", "profiles", "user_roles", "clientes", "fornecedores",
      "projetos", "etapas", "subetapas", "tarefas", "tarefa_responsaveis",
      "arquivos", "comentarios", "aprovacoes", "eventos", "parcelas",
      "revisoes", "solicitacoes_fornecedores", "orcamentos", "notificacoes",
      "time_entries", "visitas_obra", "obra_draft_media"
    ];

    // We need to get column info - let's use the Postgres system catalog
    // via a database function we'll create
    return new Response(JSON.stringify({ error: "Precisa da função get_table_ddl" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
