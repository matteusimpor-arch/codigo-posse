# Código da Posse

**Estratégia. Disciplina. Aprovação.**

Aplicativo web completo (PWA instalável) para organização, planejamento, controle de questões, revisões espaçadas e monitoramento de desempenho para concursos públicos brasileiros.

---

## Tecnologias Utilizadas

- **Front-end:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Recharts, Lucide React, React Hook Form + Zod.
- **Infraestrutura e Banco de Dados:** Supabase (PostgreSQL, Supabase Auth, Row Level Security e Supabase Storage privado).
- **PWA:** `vite-plugin-pwa` com manifesto completo, Service Worker para ativos estáticos e prompt de instalação no aplicativo.
- **Testes:** Vitest.

---

## Funcionalidades Implementadas (Etapa 1)

- Identidade visual institucional (azul-marinho `#0F172A` e dourado `#D4A853`), logomarca vetorial própria e alternância entre modo claro, escuro e automático do sistema.
- Navegação responsiva: menu lateral recolhível no desktop e barra inferior + gaveta complementar no celular.
- Autenticação real com Supabase Auth (cadastro com e-mail, login, recuperação de senha, alteração de senha, logout, proteção de rotas, tratamento de sessão expirada e suporte a Google OAuth).
- Configuração inicial do estudante (onboarding com suporte a estudo por área sem concurso específico definido).
- Gestão de **Meus Objetivos** (múltiplos objetivos, seleção de objetivo principal atômica no banco, contagem regressiva para a prova e áreas personalizadas).
- Gestão de **Disciplinas e Assuntos** (cadastro, edição, arquivamento, exclusão protegida, vínculo com múltiplos objetivos, pesquisa, filtros e árvore de assuntos e subassuntos).
- **Diário de Estudos** com registro líquido em segundos, filtros combinados e fluxo integrado opcional para programar revisões espaçadas e lançar questões sem duplicar tempo.
- **Controle de Questões** com validação rigorosa (sem negativos, frações ou divisão por zero), diferenciação entre taxa sobre o total e aproveitamento sobre respondidas, consolidação por somatório real e pontuação configurável por banca (ex.: Cebraspe).
- **Controle de Revisões** com cálculo automático de atraso, reagendamento, conclusão com nível de compreensão e prevenção contra dupla contagem de tempo.
- **Dashboard (Visão Geral)** e **Estatísticas** integrados a filtros de período, objetivo e disciplina, com gráficos Recharts e estados vazios reais.
- **Modo Demonstração Local (Testes):** disponível na tela de login exclusivamente quando as variáveis do Supabase ainda não estão configuradas.

---

## Configuração Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie um arquivo `.env.local` na raiz do projeto com base no `.env.example`:
   ```env
   VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
   VITE_SUPABASE_ANON_KEY="SUA-CHAVE-PUBLICA-ANON-OU-PUBLISHABLE"
   ```
   > **Importante:** Nunca utilize ou exponha a chave `service_role` no front-end.

3. Execute em desenvolvimento:
   ```bash
   npm run dev
   ```

---

## Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No **SQL Editor** do painel do Supabase (ou via Supabase CLI), execute os arquivos de migration na ordem numérica:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_and_storage.sql`
   - `supabase/migrations/003_functions_and_views.sql`
3. **Autenticação (Supabase Auth):**
   - Em *Authentication > Providers > Email*, confirme se o provedor por e-mail está habilitado.
   - Em *Authentication > URL Configuration*, adicione a URL da aplicação em **Site URL** e em **Redirect URLs** (ex.: `http://localhost:3000/` e sua URL de produção na Vercel).
4. **Login com Google (OAuth):**
   - Crie credenciais OAuth 2.0 no Google Cloud Console com o callback fornecido pelo Supabase (`https://SEU-PROJETO.supabase.co/auth/v1/callback`).
   - Em *Authentication > Providers > Google*, habilite o provedor e informe `Client ID` e `Client Secret`.
5. **Storage Privado:**
   - A migration `002_rls_and_storage.sql` cria automaticamente os buckets privados `avatars` e `study-attachments` com políticas RLS que restringem o acesso à pasta do próprio `auth.uid()`.
6. **Exclusão Segura de Conta (Edge Function):**
   - Para ativar a exclusão definitiva da conta pelo usuário, implante a Edge Function localizada em `supabase/functions/delete-account/index.ts`:
     ```bash
     supabase functions deploy delete-account
     ```

---

## Testes

Execute os testes unitários dos cálculos matemáticos obrigatórios e regras de integridade:

```bash
npx vitest run
```

Para verificação de tipagem e build de produção:

```bash
npm run lint
npm run build
```

---

## Publicação (Vercel / GitHub)

1. Conecte o repositório na Vercel.
2. Configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_PUBLISHABLE_KEY`) no painel do provedor de hospedagem.
3. Defina o comando de build como `npm run build` e diretório de saída `dist`.
4. Adicione o domínio de produção às **Redirect URLs** no painel do Supabase Auth.

---

## Limitações Conhecidas da Etapa 1

- Os módulos de **Edital Verticalizado**, **Planejamento Semanal**, **Calendário**, **Metas Avançadas**, **Cronômetro/Pomodoro**, **Caderno de Erros**, **Simulados** e **Relatórios/Backup** possuem rotas e tabelas SQL preparadas para as Etapas 2 e 3, com telas informativas até a conclusão das respectivas etapas.
- O login com Google e a exclusão definitiva de conta dependem da configuração do provedor OAuth e da implantação da Edge Function no projeto Supabase do ambiente.
