import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SchemaDDLDialog() {
  const [open, setOpen] = useState(false);
  const [ddl, setDdl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDDL = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_schema_ddl");
      if (error) throw error;
      setDdl(data as string);
    } catch (err: any) {
      toast.error("Erro ao gerar DDL: " + (err?.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !ddl) {
      fetchDDL();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ddl);
    setCopied(true);
    toast.success("SQL copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Code className="size-4" />
          <span>Exportar SQL (DDL)</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>SQL das Tabelas do Sistema</span>
            {ddl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copiado!" : "Copiar SQL"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Gerando DDL...</span>
          </div>
        ) : (
          <Textarea
            readOnly
            value={ddl}
            className="flex-1 min-h-[400px] font-mono text-xs resize-none"
            placeholder="Nenhum SQL gerado ainda..."
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
