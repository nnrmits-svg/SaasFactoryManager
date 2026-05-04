'use client';

import { useState, useMemo } from 'react';
import { AiAssistant } from './ai-assistant';

export interface BusinessBrief {
  dolor: string;
  costo: string;
  solucion: string;
  flujo: string;
  usuario: string;
  datos: string;
  kpi: string;
  monetizacion: string;
  diseno: string;
}

interface ProjectWizardProps {
  onComplete: (data: {
    name: string;
    description: string;
    brief: BusinessBrief;
    skills: string[];
  }) => void;
  onCancel: () => void;
  saving: boolean;
}

interface SkillOption {
  id: string;
  label: string;
  description: string;
  required: boolean;
  defaultChecked: boolean;
}

const AVAILABLE_SKILLS: SkillOption[] = [
  {
    id: 'bitacora',
    label: 'Bitacora',
    description: 'Registro cronologico de sesiones por proyecto (obligatorio)',
    required: true,
    defaultChecked: true,
  },
  {
    id: 'project-plan',
    label: 'Project Plan',
    description: 'Plan vivo del proyecto: vision, estado, decisiones (obligatorio)',
    required: true,
    defaultChecked: true,
  },
  {
    id: 'add-login',
    label: 'Login + Auth',
    description: 'Autenticacion completa: signup, login, password reset, OAuth Google',
    required: false,
    defaultChecked: false,
  },
  {
    id: 'add-payments',
    label: 'Pagos (Polar)',
    description: 'Checkout + webhooks + suscripciones con Polar (Merchant of Record)',
    required: false,
    defaultChecked: false,
  },
  {
    id: 'add-emails',
    label: 'Emails (Resend)',
    description: 'Emails transaccionales: welcome, magic link, batch sending',
    required: false,
    defaultChecked: false,
  },
  {
    id: 'add-mobile',
    label: 'PWA + Push',
    description: 'PWA instalable + push notifications (iOS compatible)',
    required: false,
    defaultChecked: false,
  },
  {
    id: 'add-security',
    label: 'Seguridad enterprise',
    description: 'Roles + RLS, 2FA/MFA, rate limiting, audit logs',
    required: false,
    defaultChecked: false,
  },
  {
    id: 'fluya-brand',
    label: 'Branding Fluya',
    description: 'Logo, header, footer, paleta dark, gradientes, manifest PWA',
    required: false,
    defaultChecked: false,
  },
];

const STEPS = [
  {
    id: 'dolor',
    title: 'El Dolor',
    question: 'Que proceso de negocio esta roto, es lento o costoso hoy?',
    placeholder: 'Ej: Las inmobiliarias pierden 4 horas al dia copiando datos de Excel a contratos en Word',
    hint: 'Describe el PROBLEMA, no la solucion.',
  },
  {
    id: 'costo',
    title: 'El Costo',
    question: 'Cuanto cuesta este problema actualmente?',
    placeholder: 'Ej: Cuesta $2000/mes en horas hombre, o se pierden 20% de los leads',
    hint: 'En tiempo, dinero o frustracion. Se especifico.',
  },
  {
    id: 'solucion',
    title: 'La Solucion',
    question: 'En UNA SOLA FRASE, que hace tu herramienta?',
    placeholder: 'Ej: Un generador automatico de contratos legales para inmobiliarias basado en plantillas',
    hint: 'Formato: "Un [tipo] que [accion] para [usuario]"',
  },
  {
    id: 'flujo',
    title: 'El Flujo',
    question: 'Describe paso a paso que hace el usuario (happy path)',
    placeholder: 'Ej:\n1. Sube Excel con datos del cliente\n2. El sistema extrae y valida datos\n3. Selecciona plantilla de contrato\n4. Genera PDF y envia por email',
    hint: 'Describe el flujo principal de la herramienta.',
    multiline: true,
  },
  {
    id: 'usuario',
    title: 'El Usuario',
    question: 'Quien va a usar esto ESPECIFICAMENTE?',
    placeholder: 'Ej: El Gerente de Operaciones que esta harto de errores manuales.\nAdmin: acceso total\nOperador: CRUD de contratos',
    hint: 'No digas "empresas". Di el ROL EXACTO con permisos.',
    multiline: true,
  },
  {
    id: 'datos',
    title: 'Los Datos',
    question: 'Que informacion ENTRA y SALE del sistema?',
    placeholder: 'Ej:\nEntrada: Excel con datos de clientes, plantillas Word\nSalida: PDFs de contratos, reportes mensuales, emails automaticos',
    hint: 'Archivos, formularios, APIs que entran. Reportes, dashboards, PDFs que salen.',
    multiline: true,
  },
  {
    id: 'kpi',
    title: 'El Exito',
    question: 'Que resultado MEDIBLE define el exito del MVP?',
    placeholder: 'Ej: Reducir tiempo de creacion de contratos de 4 horas a 5 minutos',
    hint: 'Un KPI concreto y medible.',
  },
  {
    id: 'monetizacion',
    title: 'Monetizacion',
    question: 'Como vas a cobrar?',
    placeholder: 'Ej: Suscripcion mensual $29/mes para plan basico, $99/mes para pro',
    hint: 'Freemium, suscripcion, por uso, one-time, o "todavia no se".',
  },
  {
    id: 'diseno',
    title: 'Diseno Visual',
    question: 'Que estilo visual queres?',
    placeholder: 'Ej: Moderno y limpio, estilo dashboard con cards',
    hint: 'Neobrutalism, Liquid Glass, Gradient Mesh, Bento Grid, Neumorphism, o describilo.',
  },
];

export function ProjectWizard({ onComplete, onCancel, saving }: ProjectWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [projectName, setProjectName] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(
    () => new Set(AVAILABLE_SKILLS.filter((s) => s.defaultChecked).map((s) => s.id)),
  );

  const SKILLS_STEP_INDEX = STEPS.length;
  const currentStep = STEPS[step];
  const isInterviewStep = step >= 0 && step < STEPS.length;
  const isSkillsStep = step === SKILLS_STEP_INDEX;
  const isLastStep = isSkillsStep;
  const isNameStep = step === -1;
  const totalSteps = STEPS.length + 1;

  function toggleSkill(id: string) {
    const skill = AVAILABLE_SKILLS.find((s) => s.id === id);
    if (!skill || skill.required) return;
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleNext() {
    if (isLastStep) {
      const brief: BusinessBrief = {
        dolor: answers.dolor || '',
        costo: answers.costo || '',
        solucion: answers.solucion || '',
        flujo: answers.flujo || '',
        usuario: answers.usuario || '',
        datos: answers.datos || '',
        kpi: answers.kpi || '',
        monetizacion: answers.monetizacion || '',
        diseno: answers.diseno || '',
      };

      const description = answers.solucion || '';
      const skills = AVAILABLE_SKILLS.filter(
        (s) => s.required || selectedSkills.has(s.id),
      ).map((s) => s.id);
      onComplete({ name: projectName, description, brief, skills });
      return;
    }

    setStep(step + 1);
  }

  function handleBack() {
    if (step === 0) {
      setStep(-1);
      return;
    }
    setStep(step - 1);
  }

  const canProceed = isNameStep
    ? projectName.trim().length > 0
    : isSkillsStep
      ? true
      : (answers[currentStep?.id] || '').trim().length > 0;

  const stepContext = useMemo(() => {
    if (!currentStep) return null;
    const previousPairs = STEPS.slice(0, step)
      .map((s) => `${s.title}: ${answers[s.id] || '(sin respuesta)'}`)
      .join('\n');
    return {
      title: currentStep.title,
      question: currentStep.question,
      hint: currentStep.hint,
      previousAnswers: previousPairs || undefined,
    };
  }, [currentStep, step, answers]);

  function handleSuggestionAccept(text: string) {
    if (!currentStep) return;
    const current = answers[currentStep.id] || '';
    const newValue = current ? `${current}\n${text}` : text;
    setAnswers({ ...answers, [currentStep.id]: newValue });
  }

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
      {/* Progress */}
      {!isNameStep && (
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-purple-500' : i === step ? 'bg-purple-400' : 'bg-white/10'
              }`}
            />
          ))}
          <div
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isSkillsStep ? 'bg-purple-400' : 'bg-white/10'
            }`}
          />
        </div>
      )}

      {/* Name Step */}
      {isNameStep && (
        <>
          <h2 className="text-lg font-semibold text-white mb-1">Nombre del Proyecto</h2>
          <p className="text-sm text-gray-400 mb-4">Como se llama tu SaaS?</p>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ej: ContractGen, QuickInvoice, TeamTracker..."
            autoFocus
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors text-lg"
            onKeyDown={(e) => e.key === 'Enter' && canProceed && setStep(0)}
          />
        </>
      )}

      {/* Skills Step (final) */}
      {isSkillsStep && (
        <>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-white">Skills iniciales</h2>
            <span className="text-xs text-gray-500">{totalSteps} / {totalSteps}</span>
          </div>
          <p className="text-sm text-purple-400 mb-4">
            Que skills aplicar al proyecto al crearlo? Bitacora y Project Plan son obligatorios.
          </p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {AVAILABLE_SKILLS.map((skill) => {
              const checked = skill.required || selectedSkills.has(skill.id);
              return (
                <label
                  key={skill.id}
                  className={`flex items-start gap-3 p-3 bg-black/30 border border-white/10 rounded-xl ${
                    skill.required
                      ? 'opacity-90 cursor-not-allowed'
                      : 'cursor-pointer hover:border-purple-500/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={skill.required}
                    onChange={() => toggleSkill(skill.id)}
                    className="mt-0.5 rounded border-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium flex items-center gap-2">
                      {skill.label}
                      {skill.required && (
                        <span className="text-[10px] uppercase text-purple-400 tracking-wide">
                          obligatorio
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{skill.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Podes aplicar mas skills despues desde la pantalla Skills del agente.
          </p>
        </>
      )}

      {/* Interview Steps */}
      {isInterviewStep && currentStep && (
        <>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-white">{currentStep.title}</h2>
            <span className="text-xs text-gray-500">{step + 1} / {totalSteps}</span>
          </div>
          <p className="text-sm text-purple-400 mb-4">{currentStep.question}</p>

          {currentStep.multiline ? (
            <textarea
              value={answers[currentStep.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentStep.id]: e.target.value })}
              placeholder={currentStep.placeholder}
              rows={5}
              autoFocus
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
            />
          ) : (
            <input
              type="text"
              value={answers[currentStep.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentStep.id]: e.target.value })}
              placeholder={currentStep.placeholder}
              autoFocus
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
            />
          )}

          <p className="mt-2 text-xs text-gray-500">{currentStep.hint}</p>

          {/* AI Assistant */}
          {stepContext && (
            <AiAssistant
              stepContext={stepContext}
              onSuggestionAccept={handleSuggestionAccept}
            />
          )}
        </>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        {isNameStep ? (
          <>
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setStep(0)}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              Empezar Entrevista
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              Atras
            </button>
            <button
              type="button"
              disabled={!canProceed || saving}
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              {saving ? 'Creando...' : isLastStep ? 'Crear Proyecto' : 'Siguiente'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
