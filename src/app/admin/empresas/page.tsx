"use client";

// ============================================================
// page.tsx — Administração da Empresa · IT Control
// Rota: /admin/empresas
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  MapPin,
  User,
  ImageIcon,
  PenLine,
  Settings2,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Mail,
  Phone,
  Hash,
  ChevronLeft,
} from "lucide-react";

import { empresaSchema, EmpresaFormInput, EmpresaFormData, EmpresaFormDataWithUrls, ESTADOS_BR } from "./types";
import { SectionCard } from "src/components/admin/empresa/SectionCard";
import { FormField, inputClass } from "src/components/admin/empresa/FormField";
import { UploadCard } from "src/components/admin/empresa/UploadCard";
import { ToggleSwitch } from "src/components/admin/empresa/ToggleSwitch";
import { PageSkeleton } from "src/components/admin/empresa/PageSkeleton";

// ── Máscaras de input ────────────────────────────────────────
function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCEP(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

// ── Toast de feedback ────────────────────────────────────────
interface ToastProps {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}

function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-lg border
        animate-in slide-in-from-bottom-3 fade-in duration-300
        ${
          type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
        }
      `}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-current opacity-50 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function EmpresasPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estado dos uploads (logo e assinatura)
  const [logoFile, setLogoFile] = useState<{
    file: File | null;
    preview: string | null;
  }>({ file: null, preview: null });
  const [assinaturaFile, setAssinaturaFile] = useState<{
    file: File | null;
    preview: string | null;
  }>({ file: null, preview: null });

  // ── React Hook Form com validação Zod ──────────────────────
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  // useForm<TFieldValues, TContext, TTransformedValues>
  // - EmpresaFormInput  → tipo de entrada (o que o form armazena; booleans podem ser undefined)
  // - unknown           → contexto (não utilizado)
  // - EmpresaFormData   → tipo de saída após o zodResolver transformar os defaults
  } = useForm<EmpresaFormInput, unknown, EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      usarLogoNoPdf: true,
      exibirCargoRepresentante: true,
      assinaturaAutomatica: false,
      mostrarEnderecoNoTermo: true,
    },
  });

  // ── Busca os dados existentes da empresa ───────────────────
  useEffect(() => {
    async function fetchEmpresa() {
      try {
        const res = await fetch("/api/admin/empresa");
        const data = await res.json();
        
        if (res.ok && data) {
          reset(data as EmpresaFormData);
        }
      } catch {
        // Se não houver dados, não mostra erro - é normal para primeira vez
      } finally {
        setIsLoading(false);
      }
    }
    fetchEmpresa();
  }, [reset]);

  // ── CEP autofill (ViaCEP) ──────────────────────────────────
  const handleCEPBlur = useCallback(
    async (cep: string) => {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) return;
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue("rua", data.logradouro || "", { shouldDirty: true });
          setValue("bairro", data.bairro || "", { shouldDirty: true });
          setValue("cidade", data.localidade || "", { shouldDirty: true });
          setValue("estado", data.uf || "", { shouldDirty: true });
        }
      } catch {
        // Silencioso — usuário pode preencher manualmente
      }
    },
    [setValue]
  );

  // ── Submit ─────────────────────────────────────────────────
  const onSubmit = async (data: EmpresaFormData) => {
    setIsSaving(true);
    try {
      // Adicionar logoUrl e assinaturaUrl ao data se houver preview
      const dataToSend: EmpresaFormDataWithUrls = {
        ...data,
        logoUrl: logoFile.preview || undefined,
        assinaturaUrl: assinaturaFile.preview || undefined,
      };

      const res = await fetch("/api/admin/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao salvar");
      }

      setToast({ type: "success", message: "Dados da empresa salvos com sucesso!" });
      // Redirecionar para a tela de consulta após salvar
      setTimeout(() => {
        window.location.href = '/admin/empresas/lista';
      }, 1000);
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: "Erro ao salvar. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cancelar ───────────────────────────────────────────────
  const handleCancel = () => {
    if (isDirty && !confirm("Descartar alterações não salvas?")) return;
    window.history.back();
  };

  // ── Render ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-gray-900">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ══════════════════════════════════════════════════
            HEADER DA PÁGINA
        ══════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Breadcrumb */}
              <button
                type="button"
                onClick={() => window.history.back()}
                className="p-1.5 rounded-lg text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h1 className="text-base font-semibold text-slate-800 dark:text-white">
                    Administração da Empresa
                  </h1>
                </div>
                <p className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">
                  Configure os dados utilizados nos Termos de Responsabilidade
                </p>
              </div>
            </div>

            {/* Botões no header (visíveis no topo) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            CONTEÚDO
        ══════════════════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ─────────────────────────────────────────────────
              1. DADOS DA EMPRESA
          ───────────────────────────────────────────────── */}
          <SectionCard
            title="Dados da Empresa"
            description="Informações principais que aparecerão nos documentos gerados"
            icon={Building2}
            iconColor="text-blue-600"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nome Fantasia */}
              <FormField
                label="Nome Fantasia"
                required
                error={errors.nomeFantasia}
              >
                <input
                  {...register("nomeFantasia")}
                  placeholder="Ex: IT Control"
                  className={inputClass(!!errors.nomeFantasia)}
                />
              </FormField>

              {/* Razão Social */}
              <FormField
                label="Razão Social"
                required
                error={errors.razaoSocial}
              >
                <input
                  {...register("razaoSocial")}
                  placeholder="Ex: IT Control Tecnologia Ltda."
                  className={inputClass(!!errors.razaoSocial)}
                />
              </FormField>

              {/* CNPJ */}
              <FormField label="CNPJ" required error={errors.cnpj}>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register("cnpj")}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    onChange={(e) => {
                      const masked = maskCNPJ(e.target.value);
                      e.target.value = masked;
                      register("cnpj").onChange(e);
                    }}
                    className={`${inputClass(!!errors.cnpj)} pl-9`}
                  />
                </div>
              </FormField>

              {/* Inscrição Estadual */}
              <FormField
                label="Inscrição Estadual"
                optional
                error={errors.inscricaoEstadual}
              >
                <input
                  {...register("inscricaoEstadual")}
                  placeholder="Ex: 123.456.789.000"
                  className={inputClass(!!errors.inscricaoEstadual)}
                />
              </FormField>

              {/* E-mail Corporativo */}
              <FormField
                label="E-mail Corporativo"
                required
                error={errors.emailCorporativo}
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register("emailCorporativo")}
                    type="email"
                    placeholder="contato@empresa.com.br"
                    className={`${inputClass(!!errors.emailCorporativo)} pl-9`}
                  />
                </div>
              </FormField>

              {/* Telefone */}
              <FormField label="Telefone" required error={errors.telefone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register("telefone")}
                    placeholder="(00) 00000-0000"
                    maxLength={16}
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      e.target.value = masked;
                      register("telefone").onChange(e);
                    }}
                    className={`${inputClass(!!errors.telefone)} pl-9`}
                  />
                </div>
              </FormField>

              {/* Website */}
              <FormField label="Website" optional error={errors.website}>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register("website")}
                    type="url"
                    placeholder="https://www.empresa.com.br"
                    className={`${inputClass(!!errors.website)} pl-9`}
                  />
                </div>
              </FormField>
            </div>
          </SectionCard>

          {/* ─────────────────────────────────────────────────
              2. ENDEREÇO
          ───────────────────────────────────────────────── */}
          <SectionCard
            title="Endereço"
            description="Localização da empresa para os termos"
            icon={MapPin}
            iconColor="text-emerald-600"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* CEP */}
              <FormField label="CEP" required error={errors.cep}>
                <input
                  {...register("cep")}
                  placeholder="00000-000"
                  maxLength={9}
                  onChange={(e) => {
                    const masked = maskCEP(e.target.value);
                    e.target.value = masked;
                    register("cep").onChange(e);
                  }}
                  onBlur={(e) => {
                    register("cep").onBlur(e);
                    handleCEPBlur(e.target.value);
                  }}
                  className={inputClass(!!errors.cep)}
                />
              </FormField>

              {/* Rua */}
              <FormField label="Rua / Logradouro" required error={errors.rua}>
                <input
                  {...register("rua")}
                  placeholder="Ex: Avenida Paulista"
                  className={inputClass(!!errors.rua)}
                />
              </FormField>

              {/* Número */}
              <FormField label="Número" required error={errors.numero}>
                <input
                  {...register("numero")}
                  placeholder="Ex: 1000"
                  className={inputClass(!!errors.numero)}
                />
              </FormField>

              {/* Complemento */}
              <FormField
                label="Complemento"
                optional
                error={errors.complemento}
              >
                <input
                  {...register("complemento")}
                  placeholder="Sala, andar, bloco..."
                  className={inputClass(!!errors.complemento)}
                />
              </FormField>

              {/* Bairro */}
              <FormField label="Bairro" required error={errors.bairro}>
                <input
                  {...register("bairro")}
                  placeholder="Ex: Bela Vista"
                  className={inputClass(!!errors.bairro)}
                />
              </FormField>

              {/* Cidade */}
              <FormField label="Cidade" required error={errors.cidade}>
                <input
                  {...register("cidade")}
                  placeholder="Ex: São Paulo"
                  className={inputClass(!!errors.cidade)}
                />
              </FormField>

              {/* Estado */}
              <FormField label="Estado" required error={errors.estado}>
                <select
                  {...register("estado")}
                  className={inputClass(!!errors.estado)}
                >
                  <option value="">Selecione o estado</option>
                  {ESTADOS_BR.map((e) => (
                    <option key={e.sigla} value={e.sigla}>
                      {e.sigla} — {e.nome}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </SectionCard>

          {/* ─────────────────────────────────────────────────
              3. REPRESENTANTE DA EMPRESA
          ───────────────────────────────────────────────── */}
          <SectionCard
            title="Representante da Empresa"
            description="Dados usados na assinatura automática dos termos"
            icon={User}
            iconColor="text-violet-600"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nome Completo */}
              <FormField
                label="Nome Completo"
                required
                error={errors.representanteNome}
              >
                <input
                  {...register("representanteNome")}
                  placeholder="Ex: Maria da Silva"
                  className={inputClass(!!errors.representanteNome)}
                />
              </FormField>

              {/* Cargo */}
              <FormField
                label="Cargo"
                required
                error={errors.representanteCargo}
              >
                <input
                  {...register("representanteCargo")}
                  placeholder="Ex: Diretora de TI"
                  className={inputClass(!!errors.representanteCargo)}
                />
              </FormField>

              {/* E-mail */}
              <FormField
                label="E-mail"
                required
                error={errors.representanteEmail}
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register("representanteEmail")}
                    type="email"
                    placeholder="representante@empresa.com.br"
                    className={`${inputClass(!!errors.representanteEmail)} pl-9`}
                  />
                </div>
              </FormField>

              {/* Telefone */}
              <FormField
                label="Telefone"
                required
                error={errors.representanteTelefone}
              >
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register("representanteTelefone")}
                    placeholder="(00) 00000-0000"
                    maxLength={16}
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      e.target.value = masked;
                      register("representanteTelefone").onChange(e);
                    }}
                    className={`${inputClass(!!errors.representanteTelefone)} pl-9`}
                  />
                </div>
              </FormField>
            </div>
          </SectionCard>

          {/* ─────────────────────────────────────────────────
              4. LOGO + 5. ASSINATURA (lado a lado no desktop)
          ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <SectionCard
              title="Logo da Empresa"
              description="Exibida no cabeçalho dos PDFs gerados"
              icon={ImageIcon}
              iconColor="text-orange-500"
            >
              <UploadCard
                title="Logotipo"
                description="Imagem principal da empresa para os documentos"
                accept=".png,.jpg,.jpeg,.svg"
                acceptLabel="PNG, JPG, SVG"
                maxSizeMB={5}
                currentUrl={null}
                onFileChange={(file, preview) =>
                  setLogoFile({ file, preview })
                }
              />
            </SectionCard>

            {/* Assinatura */}
            <SectionCard
              title="Assinatura da Representante"
              description="Usada na assinatura automática dos termos"
              icon={PenLine}
              iconColor="text-pink-500"
            >
              <UploadCard
                title="Arquivo de assinatura"
                description="Será inserida nos documentos gerados"
                accept=".png,.jpg,.jpeg"
                acceptLabel="PNG (preferencialmente), JPG"
                maxSizeMB={5}
                hint="Utilize uma assinatura com fundo transparente para melhor visualização nos documentos."
                currentUrl={null}
                onFileChange={(file, preview) =>
                  setAssinaturaFile({ file, preview })
                }
              />
            </SectionCard>
          </div>

          {/* ─────────────────────────────────────────────────
              6. CONFIGURAÇÕES DE TERMOS
          ───────────────────────────────────────────────── */}
          <SectionCard
            title="Configurações de Termos"
            description="Controle o que será exibido nos PDFs gerados automaticamente"
            icon={Settings2}
            iconColor="text-slate-600"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Switch: Logo no PDF */}
              <Controller
                name="usarLogoNoPdf"
                control={control}
                render={({ field }) => (
                  <ToggleSwitch
                    id="usarLogoNoPdf"
                    label="Utilizar logo nos PDFs"
                    description="Exibe o logotipo no cabeçalho dos documentos"
                    checked={field.value ?? true}
                    onChange={field.onChange}
                  />
                )}
              />

              {/* Switch: Cargo do representante */}
              <Controller
                name="exibirCargoRepresentante"
                control={control}
                render={({ field }) => (
                  <ToggleSwitch
                    id="exibirCargoRepresentante"
                    label="Exibir cargo da representante"
                    description="Inclui o cargo abaixo do nome na assinatura"
                    checked={field.value ?? true}
                    onChange={field.onChange}
                  />
                )}
              />

              {/* Switch: Assinatura automática */}
              <Controller
                name="assinaturaAutomatica"
                control={control}
                render={({ field }) => (
                  <ToggleSwitch
                    id="assinaturaAutomatica"
                    label="Assinatura automática da empresa"
                    description="Aplica a assinatura automaticamente em novos termos"
                    checked={field.value ?? false}
                    onChange={field.onChange}
                  />
                )}
              />

              {/* Switch: Endereço no termo */}
              <Controller
                name="mostrarEnderecoNoTermo"
                control={control}
                render={({ field }) => (
                  <ToggleSwitch
                    id="mostrarEnderecoNoTermo"
                    label="Mostrar endereço completo no termo"
                    description="Exibe o endereço no rodapé dos documentos"
                    checked={field.value ?? true}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════════════
              BOTÕES DE AÇÃO FINAIS
          ══════════════════════════════════════════════════ */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2 pb-10">
            {/* Indicador de alterações não salvas */}
            {isDirty && (
              <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Há alterações não salvas
              </p>
            )}
            <div className={`flex gap-3 ${!isDirty ? "ml-auto" : ""}`}>
              {/* Cancelar */}
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-300 dark:hover:border-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>

              {/* Salvar */}
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm shadow-blue-200 hover:shadow-md hover:shadow-blue-200 hover:-translate-y-px active:translate-y-0"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Dados da Empresa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Toast de feedback ─────────────────────────────────── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
