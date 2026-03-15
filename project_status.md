# tchat - Status do Projeto e Pendências

Este documento descreve o estado atual do projeto **tchat** e detalha o que ainda falta ser implementado, baseado na análise da estrutura de pastas e do código-fonte.

---

## 📊 Resumo de Progresso por Marco

| Marco | Descrição | Status | Progresso |
| :--- | :--- | :--- | :--- |
| **Marco 1** | Núcleo Criptográfico (Rust) | Quase concluído | 90% |
| **Marco 2** | Infraestrutura Backend (NestJS) | Em desenvolvimento | 70% |
| **Marco 3** | Terminal UI (React/Blessed) | Inicial/Mockup | 20% |
| **Marco 4** | Integração E2EE e UX Avançada | Não iniciado | 0% |
| **Marco 5** | Lançamento e Transparência | Não iniciado | 0% |

---

## 🛠️ O que já existe (Concluído)

### **Núcleo Rust (`packages/core-rust`)**
- [x] Derivação de chave mestra com **Argon2id**.
- [x] Geração de par de chaves **Ed25519**.
- [x] Sistema de cofre local (**Vault**) com persistência cifrada em `~/.tkeys/vault.json`.
- [x] Bridge **NAPI-RS** configurada para comunicação com TypeScript.
- [x] Lógica básica de **TOTP** implementada.

### **Backend (`apps/server`)**
- [x] Boilerplate NestJS com Prisma (PostgreSQL).
- [x] Esquema de banco de dados (User, Room, Message).
- [x] Serviço de Chat com integração **Redis (Pub/Sub)** para escalabilidade.
- [x] Stream de eventos via **SSE (Server-Sent Events)**.
- [x] Lógica de verificação de assinaturas criptográficas no `AuthService`.

---

## 🚩 O que ainda falta (Pendências)

### **1. Integração do Cliente (Terminal UI)**
A interface atual é apenas um mockup visual. Falta injetar o motor de lógica:
- [ ] **Fluxo de Autenticação:** Implementar as telas de "Primeiro Acesso" (criação de cofre) e "Desbloqueio" (senha para ler o cofre).
- [ ] **Consumo de SSE:** Conectar o client ao endpoint de stream do servidor para receber mensagens em tempo real.
- [ ] **Envio de Mensagens:** Integrar o input da TUI com o Rust para assinar o payload antes de enviar via POST ao servidor.
- [ ] **Gestão de Estado:** Sincronizar a lista de canais, lista de usuários online e histórico de mensagens na UI.

### **2. Refinamentos no Backend**
- [ ] **Controllers de Autenticação:** O `AuthService` possui a lógica, mas faltam os Endpoints de API para setup e ativação de **2FA**.
- [ ] **Guards de Segurança:** Implementar um Guard global ou específico que valide a assinatura Ed25519 em todos os requests sensíveis (evitando spam e personificação).
- [ ] **Gestão de Salas:** Implementar lógica para criação de salas e convite de usuários (apenas via PubKey).

### **3. Funcionalidades Avançadas (Marco 4)**
- [ ] **Handshake E2EE:** Implementar troca de chaves para criptografia simétrica de sala (atualmente o server vê o payload se ele for o destinatário, embora o plano seja Zero-Knowledge total).
- [ ] **Sincronização de Histórico:** Lógica para carregar mensagens anteriores ao abrir o terminal.
- [ ] **Notificações:** Alertas nativos do sistema operacional quando o terminal estiver em segundo plano.

### **4. DevOps e Distribuição (Marco 5)**
- [ ] **Scripts de Instalação:** Criar instaladores para Linux/Mac (ex: script curl).
- [ ] **CI/CD:** Configurar GitHub Actions para compilar o core em Rust para diferentes arquiteturas (x64, arm64).
- [ ] **Documentação do Protocolo:** Documentar formalmente como as chaves são derivadas e as mensagens assinadas para auditoria.

---

## 💡 Próximos Passos Recomendados
1. Finalizar o fluxo de **Boot** do cliente (Check Vault -> Unlock/Create -> Connect).
2. Implementar o **Guard de Assinatura** no servidor para garantir a segurança prometida.
3. Conectar o **Input Bar** do cliente ao serviço de envio de mensagens.
