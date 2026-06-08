// ============================================================
// types.ts — Interfaces TypeScript e schema Zod para Empresa
// ============================================================

import { z } from "zod";

// ── Zod Schema de Validação ──────────────────────────────────
export const empresaSchema = z.object({
  // Dados da Empresa
  nomeFantasia: z
    .string()
    .min(2, "Nome fantasia deve ter ao menos 2 caracteres")
    .max(100, "Nome fantasia muito longo"),
  razaoSocial: z
    .string()
    .min(2, "Razão social deve ter ao menos 2 caracteres")
    .max(150, "Razão social muito longa"),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (ex: 00.000.000/0000-00)"),
  inscricaoEstadual: z.string().optional().or(z.literal("")),
  emailCorporativo: z.string().email("E-mail corporativo inválido"),
  telefone: z
    .string()
    .min(10, "Telefone inválido")
    .max(20, "Telefone inválido"),
  website: z
    .string()
    .url("URL inválida (inclua https://)")
    .optional()
    .or(z.literal("")),

  // Endereço
  cep: z
    .string()
    .regex(/^\d{5}-\d{3}$/, "CEP inválido (ex: 00000-000)"),
  rua: z.string().min(3, "Rua obrigatória"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  estado: z.string().length(2, "Use a sigla do estado (ex: SP)"),

  // Representante
  representanteNome: z
    .string()
    .min(3, "Nome completo obrigatório"),
  representanteCargo: z.string().min(2, "Cargo obrigatório"),
  representanteEmail: z.string().email("E-mail do representante inválido"),
  representanteTelefone: z
    .string()
    .min(10, "Telefone do representante inválido"),

  // Configurações de Termos
  usarLogoNoPdf: z.boolean().default(true),
  exibirCargoRepresentante: z.boolean().default(true),
  assinaturaAutomatica: z.boolean().default(false),
  mostrarEnderecoNoTermo: z.boolean().default(true),
});

// ── Tipos do schema ──────────────────────────────────────────
// z.input: tipo dos valores ANTES da transformação (o que o form gerencia)
// z.output: tipo dos valores APÓS a transformação/default (o que o onSubmit recebe)
//
// Campos com .default() têm input `boolean | undefined` e output `boolean`.
// Usamos z.input para tipar o useForm (evita conflito com Resolver)
// e z.output para tipar o handler onSubmit.
export type EmpresaFormInput = z.input<typeof empresaSchema>;
export type EmpresaFormData = z.output<typeof empresaSchema>;

// ── Interface completa (inclui campos de banco) ──────────────
export interface Empresa extends EmpresaFormData {
  id: string;
  logoUrl?: string | null;
  assinaturaUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Estado de upload de arquivo ──────────────────────────────
export interface FileUploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  error: string | null;
}

// ── Resposta da API ──────────────────────────────────────────
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ── Estados do formulário ────────────────────────────────────
export type FormStatus = "idle" | "loading" | "success" | "error";

// ── Estados do Brasil para o select ─────────────────────────
export const ESTADOS_BR = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
] as const;