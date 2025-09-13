# Backend OS - Frontend React

Sistema de controle de dedetização/serviços com interface moderna em React.

## 🚀 Tecnologias

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** para interface
- **TanStack Query** para gerenciamento de estado e cache
- **React Router v6** para roteamento
- **React Hook Form** + **Zod** para formulários
- **Framer Motion** para animações
- **FullCalendar** para agenda
- **React Hot Toast** para notificações

## 🛠️ Setup

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# URL do backend
VITE_API_URL=http://localhost:5000/api/v1

# Autenticação (opcional)
VITE_ENABLE_AUTH=false

# Informações do app
VITE_APP_NAME=Backend OS
VITE_APP_VERSION=1.0.0
```

3. Execute o projeto:

```bash
npm run dev
```

## 📱 Funcionalidades

### Dashboard
- KPIs dos últimos 30 dias
- Próximas ordens de serviço
- Produtos com estoque crítico

### Clientes
- Lista paginada com busca
- Cadastro rápido via modal
- Ordenação por nome/data

### Produtos/Estoque
- Controle de quantidade com updates otimistas
- Filtro de produtos críticos
- Editor de quantidade (delta ou absoluto)
- Alertas visuais para estoque baixo

### Ordens de Serviço
- Listagem com filtros avançados
- Wizard de criação em 2 etapas
- Geração de PDF
- Códigos públicos automáticos

### Agenda
- Calendário mensal/semanal/diário
- Sincronização com ordens de serviço
- Modal com detalhes do agendamento

## 🎨 Design System

### Cores
- **Primária**: `#2563eb` (blue-600)
- **Sucesso**: `#22c55e` (green-500)
- **Erro**: `#ef4444` (red-500)
- **Aviso**: `#eab308` (yellow-500)

### Tema
- Suporte a tema claro/escuro
- Auto-detecção baseada em `prefers-color-scheme`
- Toggle persistente no localStorage

### Animações
- Transições de página: 120ms fade/slide
- Hover states em cards: leve elevação
- Modal: scale+fade 120ms

## 🔧 Configuração da API

O frontend consome uma API REST com os seguintes endpoints:

### Clientes
- `GET /clients?search=&cursor=&limit=`
- `POST /clients`

### Produtos
- `GET /products?only_critical=&cursor=&limit=`
- `PATCH /products/{id}/quantity`

### Ordens de Serviço
- `GET /service-orders?client_id=&status=&date_from=&date_to=&cursor=&limit=`
- `POST /service-orders`
- `GET /service-orders/{id}`
- `GET /service-orders/{id}/pdf?template=`

### Calendário
- `GET /calendar?start=&end=`

### Autenticação (opcional)
- `POST /auth/login`

## 📦 Scripts

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run lint` - Verificação de código

## 🔍 Estrutura do Projeto

```
src/
├── api/                 # Configuração e hooks da API
├── app/                 # Providers e rotas
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── layout/         # Layout principal
│   ├── data-table/     # Tabela de dados
│   └── forms/          # Formulários
├── lib/                # Utilitários
├── pages/              # Páginas da aplicação
└── types/              # Tipos TypeScript
```

## 🚨 Importante

- Todos os textos estão em **português brasileiro**
- A paginação usa **cursor-based** para melhor performance
- Updates de estoque são **otimistas** com rollback automático
- Todas as requisições incluem tratamento de erro via **Problem+JSON**
- O sistema suporta **idempotência** nas operações críticas

## 📝 Próximos Passos

1. Implementar wizard completo de criação de OS
2. Adicionar página de detalhes da OS
3. Criar sistema de configurações
4. Implementar autenticação completa
5. Adicionar testes unitários
6. Otimizar bundle para produção

## 🤝 Contribuição

1. Fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Backend OS** - Sistema de controle de dedetização moderno e intuitivo.