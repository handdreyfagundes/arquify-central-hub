import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];

interface Props {
  tarefa: Tarefa;
  open: boolean;
  onClose: () => void;
  onSave: (descricao: string) => void;
}

export default function ObsPopup({ tarefa, open, onClose, onSave }: Props) {
  const [text, setText] = useState(tarefa.descricao ?? "");

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Observações</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adicione notas sobre esta tarefa..."
          rows={5}
          className="resize-none"
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave(text)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
