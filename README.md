# ⚡ PDFTurbo - Otimizador Brutal

![PDFTurbo Banner](https://picsum.photos/seed/pdfturbo/1200/400?blur=2)

> Sistema de manipulação de PDF de alta performance com compressão agressiva, interface neon e experiência de usuário ultra-fluida.

---

## 🚀 Tecnologias Envolvidas

O projeto utiliza o que há de mais moderno no ecossistema JavaScript/TypeScript para garantir performance e manutenibilidade.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

---

## ✨ Funcionalidades Principais

- 💎 **Compressão Agressiva:** Redução drástica do tamanho de arquivos PDF sem perda perceptível de qualidade.
- 🛠️ **Ferramentas de Edição:** Mesclar, dividir e organizar páginas de forma intuitiva.
- 🎨 **Interface Brutalista:** Design neon de alto contraste com animações fluidas via Framer Motion.
- ⚡ **Processamento em Tempo Real:** Feedback instantâneo durante a manipulação de arquivos.
- 🔒 **Privacidade Total:** Processamento seguro com foco em integridade de dados.

---

## 📸 Demonstração das Telas

O PDFTurbo possui uma interface intuitiva e futurista, dividida em módulos especializados:

### 1. Splash Screen - Acesso Seguro
![Splash Screen](https://raw.githubusercontent.com/seu-usuario/pdfturbo/main/screenshots/splash.png)
*Tela de entrada com o status "Iniciando Pipeline Seguro" e botão de acesso ao sistema, garantindo uma experiência de usuário imersiva desde o primeiro clique.*

### 2. Header e Guia de Navegação
![Header](https://raw.githubusercontent.com/seu-usuario/pdfturbo/main/screenshots/header.png)
*Identidade visual "TURBO" com popups informativos. Exemplo: "V10.0: Comprima arquivos grandes para o alvo de 2MB com ultra fidelidade e cores preservadas."*

### 3. Otimização V10.0 (Alvo 2MB)
![Otimizar](https://raw.githubusercontent.com/seu-usuario/pdfturbo/main/screenshots/optimize.png)
*Módulo de compressão agressiva com o motor "Hacker V10.0". Utiliza downsampling de 800px e quantização Trellis com mozjpeg para reduzir o peso binário mantendo a validade jurídica total.*

### 4. Divisão de Documentos (Split)
![Separar](https://raw.githubusercontent.com/seu-usuario/pdfturbo/main/screenshots/split.png)
*Interface de gerenciamento de arquivos para separação de páginas, permitindo selecionar e processar documentos específicos com rapidez.*

### 5. Conversão Inteligente
![Converter](https://raw.githubusercontent.com/seu-usuario/pdfturbo/main/screenshots/convert.png)
*Módulo de conversão com preservação de metadados e estrutura de documentos, garantindo que o arquivo final seja fiel ao original.*

### 6. União com Smart Scaling
![Juntar](https://raw.githubusercontent.com/seu-usuario/pdfturbo/main/screenshots/merge.png)
*Processo de mesclagem com tecnologia "Smart Scaling" para formato A4, otimizado para documentos como RG e CPF, garantindo alta fidelidade sem perda de cores.*

---

## 🛠️ Instalação e Configuração

Siga os passos abaixo para rodar o projeto localmente:

### Pré-requisitos
- [Node.js](https://nodejs.org/) (Versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/pdfturbo.git
cd pdfturbo
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (veja o `.env.example` como referência):
```env
PORT=3000
# Adicione outras chaves se necessário
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O projeto estará disponível em `http://localhost:3000`.

---

## 📦 Bibliotecas Utilizadas

| Biblioteca | Função |
| :--- | :--- |
| `pdf-lib` | Manipulação e criação de documentos PDF. |
| `pdfjs-dist` | Renderização e visualização de PDFs no navegador. |
| `motion` | Animações de interface e transições suaves. |
| `lucide-react` | Conjunto de ícones consistentes e leves. |
| `clsx` & `tailwind-merge` | Gerenciamento dinâmico de classes CSS. |
| `jszip` | Criação de arquivos compactados para múltiplos downloads. |

---

## 📂 Estrutura do Projeto

```text
├── src/
│   ├── components/     # Componentes React reutilizáveis
│   ├── services/       # Lógica de manipulação de PDF e APIs
│   ├── App.tsx         # Componente principal e roteamento
│   ├── main.tsx        # Ponto de entrada do React
│   └── index.css       # Estilos globais e Tailwind
├── server.ts           # Servidor Express (Backend)
├── vite.config.ts      # Configuração do Bundler Vite
└── package.json        # Dependências e scripts
```

---

## 🤝 Contribuição

1. Faça um **Fork** do projeto.
2. Crie uma **Branch** para sua feature (`git checkout -b feature/NovaFeature`).
3. Faça o **Commit** das suas alterações (`git commit -m 'Adicionando nova funcionalidade'`).
4. Faça o **Push** para a Branch (`git push origin feature/NovaFeature`).
5. Abra um **Pull Request**.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com ⚡ por [Seu Nome](https://github.com/seu-usuario)
