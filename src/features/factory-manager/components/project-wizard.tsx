'use client';

import { useState } from 'react';

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
  onComplete: (data: { name: string; description: string; brief: BusinessBrief }) => void;
  onCancel: () => void;
  saving: boolean;
}

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

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isNameStep = step === -1;
  const totalSteps = STEPS.length;

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
      onComplete({ name: projectName, description, brief });
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
    : (answers[currentStep?.id] || '').trim().length > 0;

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

      {/* Interview Steps */}
      {!isNameStep && currentStep && (
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
