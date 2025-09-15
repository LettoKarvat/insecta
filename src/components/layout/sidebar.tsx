// src/components/layout/sidebar.tsx (ou caminho equivalente)
import {
  Home,
  Users,
  Package,
  ClipboardList,
  Calendar,
  Settings,
  FileText,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Estoque", href: "/produtos", icon: Package },
  { name: "Ordens de Serviço", href: "/ordens-servico", icon: ClipboardList },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Pablo clique aqui", href: "/configuracoes", icon: Settings },

  // 👇 Agora vai para a lista
  { name: "FAES", href: "/faes", icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const isItemActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  return (
    <div className="w-64 h-full bg-background border-r">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary">Darlan MataRato</h1>
        <p className="text-sm text-muted-foreground">Controle de Dedetização</p>
      </div>

      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              aria-current={active ? "page" : undefined}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
