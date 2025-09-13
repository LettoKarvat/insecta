import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { QuantityEditor } from "@/components/quantity-editor/quantity-editor";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useProducts,
  useUpdateProductQuantity,
  useDeleteProduct,
} from "@/api/hooks/useProducts";
import { Product } from "@/types/api";
import { Package, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Passos e casas por unidade (menos casas no display) */
const UNIT_CFG: Record<
  string,
  {
    step: number;
    fast: number;
    decimals: number;
    subScale?: number;
    subLabel?: string;
  }
> = {
  L: { step: 0.02, fast: 0.1, decimals: 2, subScale: 1000, subLabel: "mL" }, // 20 mL | 100 mL
  kg: { step: 0.05, fast: 0.25, decimals: 2, subScale: 1000, subLabel: "g" }, // 50 g  | 250 g
  m: { step: 0.1, fast: 0.5, decimals: 1, subScale: 100, subLabel: "cm" }, // 10 cm | 50 cm
};

const fmtQty = (v: number, decimals: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: decimals });

export function Products() {
  const navigate = useNavigate();
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [cursor, setCursor] = useState("");

  const { data, isLoading } = useProducts(onlyCritical, cursor);
  const updateQuantityMutation = useUpdateProductQuantity();
  const deleteProductMutation = useDeleteProduct();

  const handleQuantityUpdate = (
    id: number,
    value: number,
    isAbsolute?: boolean
  ) => {
    if (!Number.isFinite(value)) return;
    if (updateQuantityMutation.isPending) return;
    const payload = isAbsolute
      ? { absolute: Number(value) }
      : { delta: Number(value) };
    updateQuantityMutation.mutate({ id, data: payload });
  };

  const handleDelete = (item: Product) => {
    if (deleteProductMutation.isPending) return;
    if (
      !window.confirm(
        `Excluir o produto "${item.name}"? Essa ação não pode ser desfeita.`
      )
    )
      return;
    deleteProductMutation.mutate(item.id);
  };

  const columns = [
    {
      key: "name",
      title: "Produto",
      sortable: true,
      render: (value: string, item: Product) => (
        <button
          type="button"
          onClick={() => navigate(`/produtos/${item.id}`)}
          className="text-primary hover:underline font-medium"
          title="Abrir detalhes"
        >
          {value}
        </button>
      ),
    },
    { key: "unit", title: "Unidade" },
    { key: "min_quantity", title: "Mínimo" },
    {
      key: "current_quantity",
      title: "Atual",
      render: (value: number, item: Product) => {
        const cfg = UNIT_CFG[item.unit] ?? { decimals: 0 };
        const isCritical =
          typeof (item as any).is_critical === "boolean"
            ? (item as any).is_critical
            : value < item.min_quantity;

        const pretty = fmtQty(value, cfg.decimals);
        const sub = cfg.subScale ? Math.round(value * cfg.subScale) : null;

        return (
          <div className="flex items-center gap-2">
            <span className={isCritical ? "font-bold text-destructive" : ""}>
              {pretty}
              {sub != null && cfg.subLabel ? (
                <span className="text-muted-foreground">
                  {" "}
                  ({sub} {cfg.subLabel})
                </span>
              ) : null}
            </span>
            {isCritical && (
              <Badge variant="destructive" className="text-xs">
                Crítico
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      title: "Ações",
      render: (_: any, item: Product) => {
        const cfg = UNIT_CFG[item.unit] ?? { step: 1, fast: 5, decimals: 0 };
        const disabled =
          updateQuantityMutation.isPending || deleteProductMutation.isPending;
        return (
          <div className="flex items-center gap-2">
            <QuantityEditor
              product={item}
              step={cfg.step}
              fastStep={cfg.fast}
              decimals={cfg.decimals}
              onChange={(value, isAbsolute) =>
                handleQuantityUpdate(item.id, value, isAbsolute)
              }
              loading={disabled}
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Editar produto"
              onClick={() => navigate(`/produtos/${item.id}`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              title="Excluir produto"
              onClick={() => handleDelete(item)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12">
      <Package className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {onlyCritical ? "Nenhum produto crítico" : "Nenhum produto encontrado"}
      </h3>
      <p className="text-muted-foreground mb-4">
        {onlyCritical
          ? "Todos os produtos estão com estoque adequado"
          : "Cadastre seus produtos para controlar o estoque"}
      </p>
    </div>
  );

  return (
    <PageShell
      title="Produtos e Estoque"
      description="Gerencie seus produtos e controle o estoque"
      action={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="only-critical"
              checked={onlyCritical}
              onCheckedChange={(v) => {
                setOnlyCritical(!!v);
                setCursor(""); // reset paginação ao mudar filtro
              }}
            />
            <Label htmlFor="only-critical" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Somente críticos
            </Label>
          </div>
          <Button onClick={() => navigate("/produtos/novo")}>
            <Package className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      }
    >
      <DataTable
        data={data?.items || []}
        columns={columns}
        loading={
          isLoading ||
          updateQuantityMutation.isPending ||
          deleteProductMutation.isPending
        }
        hasMore={!!data?.next_cursor}
        onLoadMore={() => setCursor(data?.next_cursor || "")}
        emptyState={emptyState}
      />
    </PageShell>
  );
}
