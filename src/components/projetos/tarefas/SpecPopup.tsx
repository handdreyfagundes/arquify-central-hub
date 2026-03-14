import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];

const DEFAULT_SPEC_TYPES = ["Prancha", "Móvel", "Ambiente", "Visita externa"];

interface Props {
  tarefa: Tarefa;
  open: boolean;
  onClose: () => void;
  onSave: (ambiente: string, item: string) => void;
}

export default function SpecPopup({ tarefa, open, onClose, onSave }: Props) {
  const [specTypes, setSpecTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem("spec_types");
    return saved ? JSON.parse(saved) : DEFAULT_SPEC_TYPES;
  });
  const [selectedType, setSelectedType] = useState(tarefa.ambiente ?? "");
  const [itemValue, setItemValue] = useState(tarefa.item ?? "");
  const [addingNew, setAddingNew] = useState(false);
  const [newType, setNewType] = useState("");
  const [step, setStep] = useState<1 | 2>(tarefa.ambiente ? 2 : 1);

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleAddType = () => {
    if (newType.trim()) {
      const updated = [...specTypes, newType.trim()];
      setSpecTypes(updated);
      localStorage.setItem("spec_types", JSON.stringify(updated));
      setNewType("");
      setAddingNew(false);
    }
  };

  const handleSave = () => {
    onSave(selectedType, itemValue);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Especificação</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Tipo de especificação</Label>
            <div className="grid grid-cols-2 gap-2">
              {specTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => handleSelectType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
            {addingNew ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddType()}
                  placeholder="Novo tipo..."
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddType} className="h-8 text-xs">OK</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setAddingNew(true)}>
                <Plus className="size-3" /> Novo tipo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{selectedType}</Badge>
              <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline">alterar</button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Item</Label>
              <Input
                autoFocus
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
                placeholder={
                  selectedType === "Prancha" ? "Ex: Planta elétrica"
                    : selectedType === "Móvel" ? "Ex: MO2"
                    : selectedType === "Ambiente" ? "Ex: Sala"
                    : "Ex: Reunião cliente"
                }
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          {step === 2 && (
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Need Badge import
import { Badge } from "@/components/ui/badge";
