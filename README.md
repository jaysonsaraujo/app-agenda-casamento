# 💒 Sistema de Agendamento de Casamentos

Sistema completo para gerenciamento de agendamentos de casamentos paroquiais, desenvolvido com Supabase (auto-hospedado) e otimizado para deploy no EasyPanel.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

## 📋 Índice

- [Características](#-características)
- [Tecnologias](#-tecnologias)
- [Requisitos](#-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Deploy no EasyPanel](#-deploy-no-easypanel)
- [Uso](#-uso)
- [API](#-api)
- [Desenvolvimento](#-desenvolvimento)
- [Backup](#-backup)
- [Troubleshooting](#-troubleshooting)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

## ✨ Características

### Principais Funcionalidades

- 📅 **Calendário Interativo**: Visualização mensal com scroll infinito
- 👫 **Gestão de Casamentos**: Cadastro completo de noivos e cerimônias
- 🏛️ **Múltiplos Locais**: Gerenciamento de igrejas e capelas
- ⛪ **Celebrantes**: Controle de padres e diáconos
- 🔔 **Sistema de Lembretes**: Notificações automáticas via WhatsApp
- 📊 **Estatísticas**: Dashboard com métricas importantes
- 🎯 **Validações Inteligentes**: Prevenção de conflitos de agendamento
- 📱 **Responsivo**: Funciona em desktop, tablet e mobile

### Regras de Negócio

- **Máximo de 4 eventos por dia**
- **Máximo de 3 casamentos comunitários por dia**
- **Sem conflitos de horário/local**
- **Celebrante único por horário**
- **Cálculo automático de proclames**
- **Ano anterior em modo somente leitura**

## 🛠 Tecnologias

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Design responsivo e moderno
- Tooltips e modais customizados
- Validação em tempo real

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- Docker & Docker Compose
- Helmet.js (Segurança)

### Infraestrutura
- EasyPanel ready
- Nginx (opcional)
- SSL/HTTPS support
- Health checks
- Auto-backup

## 📦 Requisitos

### Mínimos
- Node.js 18+
- Docker 20.10+
- Docker Compose 2.0+
- 1GB RAM
- 2GB Espaço em disco

### Recomendados
- 2GB+ RAM
- 10GB+ Espaço em disco
- Ubuntu 22.04 LTS
- Domínio próprio
- Certificado SSL

## 🚀 Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/wedding-scheduler.git
cd wedding-scheduler
