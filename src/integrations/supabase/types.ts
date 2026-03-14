export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      aprovacoes: {
        Row: {
          cliente_id: string | null
          comentario: string | null
          created_at: string
          etapa_id: string | null
          id: string
          projeto_id: string
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          comentario?: string | null
          created_at?: string
          etapa_id?: string | null
          id?: string
          projeto_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          comentario?: string | null
          created_at?: string
          etapa_id?: string | null
          id?: string
          projeto_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      arquivos: {
        Row: {
          created_at: string
          etapa_id: string | null
          file_url: string
          id: string
          nome: string
          projeto_id: string
          tarefa_id: string | null
          uploaded_by: string | null
          visivel_cliente: boolean | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          etapa_id?: string | null
          file_url: string
          id?: string
          nome: string
          projeto_id: string
          tarefa_id?: string | null
          uploaded_by?: string | null
          visivel_cliente?: boolean | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          etapa_id?: string | null
          file_url?: string
          id?: string
          nome?: string
          projeto_id?: string
          tarefa_id?: string | null
          uploaded_by?: string | null
          visivel_cliente?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "arquivos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          endereco_atual: string | null
          endereco_obra: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco_atual?: string | null
          endereco_obra?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco_atual?: string | null
          endereco_obra?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          projeto_id: string
          tarefa_id: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          projeto_id: string
          tarefa_id?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          projeto_id?: string
          tarefa_id?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "comentarios_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          duracao_dias: number | null
          id: string
          nome: string
          ordem: number
          progresso: number
          projeto_id: string
          status: Database["public"]["Enums"]["stage_status"]
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          duracao_dias?: number | null
          id?: string
          nome: string
          ordem?: number
          progresso?: number
          projeto_id: string
          status?: Database["public"]["Enums"]["stage_status"]
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          duracao_dias?: number | null
          id?: string
          nome?: string
          ordem?: number
          progresso?: number
          projeto_id?: string
          status?: Database["public"]["Enums"]["stage_status"]
        }
        Relationships: [
          {
            foreignKeyName: "etapas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          local: string | null
          projeto_id: string | null
          responsavel_id: string | null
          tipo_evento: Database["public"]["Enums"]["event_type"]
          titulo: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          local?: string | null
          projeto_id?: string | null
          responsavel_id?: string | null
          tipo_evento?: Database["public"]["Enums"]["event_type"]
          titulo: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          local?: string | null
          projeto_id?: string | null
          responsavel_id?: string | null
          tipo_evento?: Database["public"]["Enums"]["event_type"]
          titulo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "eventos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          avaliacao: number | null
          categoria: string | null
          cidade: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avaliacao?: number | null
          categoria?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avaliacao?: number | null
          categoria?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean | null
          mensagem: string | null
          projeto_id: string | null
          tipo: Database["public"]["Enums"]["notification_type"]
          titulo: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          projeto_id?: string | null
          tipo?: Database["public"]["Enums"]["notification_type"]
          titulo: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          projeto_id?: string | null
          tipo?: Database["public"]["Enums"]["notification_type"]
          titulo?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "notificacoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          descricao: string | null
          fornecedor_id: string
          id: string
          solicitacao_id: string
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string
          valor: number | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          fornecedor_id: string
          id?: string
          solicitacao_id: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
          valor?: number | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          fornecedor_id?: string
          id?: string
          solicitacao_id?: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          id: string
          numero_parcela: number
          projeto_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          valor: number
        }
        Insert: {
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          id?: string
          numero_parcela: number
          projeto_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          valor: number
        }
        Update: {
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          id?: string
          numero_parcela?: number
          projeto_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          cidade_calendario: string | null
          cliente_id: string | null
          cor: string | null
          count_type: string
          created_at: string
          descricao: string | null
          endereco_obra: string | null
          estado_calendario: string | null
          id: string
          imagem_capa: string | null
          metragem: number | null
          nome: string
          pais: string | null
          prazo_macro: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          valor_projeto: number | null
          workspace_id: string
        }
        Insert: {
          cidade_calendario?: string | null
          cliente_id?: string | null
          cor?: string | null
          count_type?: string
          created_at?: string
          descricao?: string | null
          endereco_obra?: string | null
          estado_calendario?: string | null
          id?: string
          imagem_capa?: string | null
          metragem?: number | null
          nome: string
          pais?: string | null
          prazo_macro?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          valor_projeto?: number | null
          workspace_id: string
        }
        Update: {
          cidade_calendario?: string | null
          cliente_id?: string | null
          cor?: string | null
          count_type?: string
          created_at?: string
          descricao?: string | null
          endereco_obra?: string | null
          estado_calendario?: string | null
          id?: string
          imagem_capa?: string | null
          metragem?: number | null
          nome?: string
          pais?: string | null
          prazo_macro?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          valor_projeto?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      revisoes: {
        Row: {
          created_at: string
          data_nova_entrega: string | null
          data_solicitacao: string
          etapa_id: string | null
          id: string
          numero_revisao: number
          observacoes: string | null
          prazo_dias: number
          subetapa_id: string | null
        }
        Insert: {
          created_at?: string
          data_nova_entrega?: string | null
          data_solicitacao: string
          etapa_id?: string | null
          id?: string
          numero_revisao?: number
          observacoes?: string | null
          prazo_dias?: number
          subetapa_id?: string | null
        }
        Update: {
          created_at?: string
          data_nova_entrega?: string | null
          data_solicitacao?: string
          etapa_id?: string | null
          id?: string
          numero_revisao?: number
          observacoes?: string | null
          prazo_dias?: number
          subetapa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisoes_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisoes_subetapa_id_fkey"
            columns: ["subetapa_id"]
            isOneToOne: false
            referencedRelation: "subetapas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_fornecedores: {
        Row: {
          created_at: string
          descricao: string | null
          fornecedor_id: string
          id: string
          projeto_id: string
          status: Database["public"]["Enums"]["supplier_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          fornecedor_id: string
          id?: string
          projeto_id: string
          status?: Database["public"]["Enums"]["supplier_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          fornecedor_id?: string
          id?: string
          projeto_id?: string
          status?: Database["public"]["Enums"]["supplier_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedores_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedores_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      subetapas: {
        Row: {
          created_at: string
          data_entrega: string | null
          etapa_id: string
          id: string
          intervalo_dias: number
          nome: string
          ordem: number
          status: string
        }
        Insert: {
          created_at?: string
          data_entrega?: string | null
          etapa_id: string
          id?: string
          intervalo_dias?: number
          nome: string
          ordem?: number
          status?: string
        }
        Update: {
          created_at?: string
          data_entrega?: string | null
          etapa_id?: string
          id?: string
          intervalo_dias?: number
          nome?: string
          ordem?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subetapas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_responsaveis: {
        Row: {
          created_at: string
          id: string
          tarefa_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tarefa_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tarefa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_responsaveis_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          ambiente: string | null
          created_at: string
          descricao: string | null
          etapa_id: string | null
          horas_estimadas: number | null
          id: string
          item: string | null
          prazo_interno: string | null
          prazo_limite: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          projeto_id: string
          responsavel_id: string | null
          revisao: number | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          ambiente?: string | null
          created_at?: string
          descricao?: string | null
          etapa_id?: string | null
          horas_estimadas?: number | null
          id?: string
          item?: string | null
          prazo_interno?: string | null
          prazo_limite?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          projeto_id: string
          responsavel_id?: string | null
          revisao?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          ambiente?: string | null
          created_at?: string
          descricao?: string | null
          etapa_id?: string | null
          horas_estimadas?: number | null
          id?: string
          item?: string | null
          prazo_interno?: string | null
          prazo_limite?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          projeto_id?: string
          responsavel_id?: string | null
          revisao?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          projeto_id: string
          start_time: string
          tarefa_id: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          projeto_id: string
          start_time: string
          tarefa_id?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          projeto_id?: string
          start_time?: string
          tarefa_id?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_projetos"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "time_entries_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          cidade: string | null
          created_at: string
          email_principal: string | null
          estado: string | null
          id: string
          logo_url: string | null
          name: string
          responsavel_nome: string | null
          tamanho_equipe: number | null
          updated_at: string
          workspace_type: Database["public"]["Enums"]["workspace_type"]
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email_principal?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          name: string
          responsavel_nome?: string | null
          tamanho_equipe?: number | null
          updated_at?: string
          workspace_type?: Database["public"]["Enums"]["workspace_type"]
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email_principal?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          responsavel_nome?: string | null
          tamanho_equipe?: number | null
          updated_at?: string
          workspace_type?: Database["public"]["Enums"]["workspace_type"]
        }
        Relationships: []
      }
    }
    Views: {
      v_rentabilidade_projetos: {
        Row: {
          nome: string | null
          projeto_id: string | null
          total_horas: number | null
          total_minutos: number | null
          valor_hora: number | null
          valor_projeto: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bootstrap_workspace: {
        Args: { _cidade?: string; _estado?: string; _workspace_name: string }
        Returns: string
      }
      get_etapa_workspace_id: { Args: { _etapa_id: string }; Returns: string }
      get_project_workspace_id: {
        Args: { _projeto_id: string }
        Returns: string
      }
      get_revisao_workspace_id: {
        Args: { _revisao_id: string }
        Returns: string
      }
      get_solicitacao_workspace_id: {
        Args: { _solicitacao_id: string }
        Returns: string
      }
      get_subetapa_workspace_id: {
        Args: { _subetapa_id: string }
        Returns: string
      }
      get_user_workspace_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "arquiteto"
        | "colaborador"
        | "cliente"
        | "fornecedor"
      approval_status: "pendente" | "aprovado" | "reprovado"
      budget_status: "pendente" | "aprovado" | "recusado"
      event_type: "reuniao" | "visita_obra" | "entrega" | "prazo" | "outro"
      invoice_status: "pendente" | "pago" | "atrasado" | "cancelado"
      notification_type:
        | "tarefa_atrasada"
        | "aprovacao_pendente"
        | "parcela_vencendo"
        | "evento_proximo"
        | "comentario"
        | "geral"
      project_status:
        | "briefing"
        | "em_andamento"
        | "pausado"
        | "concluido"
        | "cancelado"
      project_type: "arquitetura" | "interiores"
      stage_status: "pendente" | "em_andamento" | "concluida"
      supplier_request_status:
        | "pendente"
        | "enviado"
        | "respondido"
        | "aprovado"
        | "recusado"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status:
        | "pendente"
        | "em_andamento"
        | "em_revisao"
        | "concluida"
        | "cancelada"
      workspace_type: "arquitetura" | "interiores"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gestor",
        "arquiteto",
        "colaborador",
        "cliente",
        "fornecedor",
      ],
      approval_status: ["pendente", "aprovado", "reprovado"],
      budget_status: ["pendente", "aprovado", "recusado"],
      event_type: ["reuniao", "visita_obra", "entrega", "prazo", "outro"],
      invoice_status: ["pendente", "pago", "atrasado", "cancelado"],
      notification_type: [
        "tarefa_atrasada",
        "aprovacao_pendente",
        "parcela_vencendo",
        "evento_proximo",
        "comentario",
        "geral",
      ],
      project_status: [
        "briefing",
        "em_andamento",
        "pausado",
        "concluido",
        "cancelado",
      ],
      project_type: ["arquitetura", "interiores"],
      stage_status: ["pendente", "em_andamento", "concluida"],
      supplier_request_status: [
        "pendente",
        "enviado",
        "respondido",
        "aprovado",
        "recusado",
      ],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: [
        "pendente",
        "em_andamento",
        "em_revisao",
        "concluida",
        "cancelada",
      ],
      workspace_type: ["arquitetura", "interiores"],
    },
  },
} as const
