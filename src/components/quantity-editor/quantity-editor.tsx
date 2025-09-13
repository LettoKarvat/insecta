import { useEffect, useState, MouseEvent } from "react";
import { Minus, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Product } from "@/types/api";
import { motion } from "framer-motion";

type Props = {
  product: Product;
  /** onChange(delta, false)  ou  onChange(absolute, true) */
  onChange: (value: number, absolute?: boolean) => void;
  loading?: boolean;
  /** passo padrão (ex.: 0.02 L = 20 mL) */
  step?: number; // default 1
  /** passo rápido com Shift (ex.: 0.1 L = 100 mL) */
  fastStep?: number; // default 5
  /** casas decimais para arredondar/formatar */
  decimals?: number; // default 0
};

function roundTo(n: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function QuantityEditor({
  product,
  onChange,
  loading = false,
  step = 1,
  fastStep = 5,
  decimals = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valueStr, setValueStr] = useState<string>(
    String(product.current_quantity ?? 0)
  );

  // Sincroniza quando a quantidade do item mudar
  useEffect(() => {
    setValueStr(String(product.current_quantity ?? 0));
  }, [product?.id, product?.current_quantity]);

  const handleAdjust = (sign: 1 | -1, e?: MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    const s = e?.shiftKey ? fastStep : step;
    const delta = roundTo(sign * s, decimals);
    onChange(delta, false); // delta
  };

  const handleSaveAbsolute = () => {
    if (loading) return;
    const raw = (valueStr ?? "").toString().replace(",", "."); // aceita vírgula
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const abs = Math.max(0, roundTo(n, decimals));
    onChange(abs, true);
    setOpen(false);
  };

  const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveAbsolute();
    }
  };

  const fmtQty = (v: number) =>
    v.toLocaleString("pt-BR", { maximumFractionDigits: decimals });

  return (
    <div className="flex items-center gap-2">
      {/* – (Shift = passo rápido) */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => handleAdjust(-1, e)}
        disabled={loading}
        title={`-${step}  (Shift: -${fastStep})`}
      >
        <Minus className="h-3 w-3" />
      </Button>

      <motion.div
        key={`${product.id}-${product.current_quantity}`}
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        className="min-w-12 text-center font-medium"
        title="Quantidade atual"
      >
        {fmtQty(product.current_quantity)}
      </motion.div>

      {/* + (Shift = passo rápido) */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => handleAdjust(1, e)}
        disabled={loading}
        title={`+${step}  (Shift: +${fastStep})`}
      >
        <Plus className="h-3 w-3" />
      </Button>

      {/* Definir absoluto */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        disabled={loading}
        title="Definir quantidade absoluta"
      >
        <Edit className="h-3 w-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir quantidade</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`abs-${product.id}`}>Quantidade absoluta</Label>
            <Input
              id={`abs-${product.id}`}
              type="number"
              inputMode="decimal"
              step={String(Math.pow(10, -decimals))}
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveAbsolute} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuantityEditor;
