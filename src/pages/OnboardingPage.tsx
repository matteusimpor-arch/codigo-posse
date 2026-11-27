import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useData } from '../contexts/DataContext';
import { GOAL_AREAS } from '../types/database';

export const OnboardingPage: React.FC = () => {
  const { profile, completeOnboarding } = useData();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [area, setArea] = useState('Geral');
  const [examName, setExamName] = useState('');
  const [weeklyStudyTarget, setWeeklyStudyTarget] = useState('15');
  const [weeklyQuestionTarget, setWeeklyQuestionTarget] = useState('150');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (fullName.trim().length < 2) {
      setErrorMsg('Informe seu nome.');
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        area,
        examName: examName.trim(),
        position: '',
        examBoard: '',
        examDate: '',
        weeklyStudyTarget: Math.max(0, Number(weeklyStudyTarget) || 0),
        weeklyQuestionTarget: Math.max(0, Math.trunc(Number(weeklyQuestionTarget) || 0)),
        skipGoal: false,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar configuração inicial.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim() || profile?.full_name || 'Estudante',
        area: 'Geral',
        examName: '',
        position: '',
        examBoard: '',
        examDate: '',
        weeklyStudyTarget: 0,
        weeklyQuestionTarget: 0,
        skipGoal: true,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao avançar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-center py-8 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-xs">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Bem-vindo ao Código da Posse
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure o básico agora ou pule para começar a estudar imediatamente.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Seu nome *
              </label>
              <input
                type="text"
                placeholder="Ex: Mariana Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Área de interesse (opcional)
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              >
                <option value="Geral">Ainda não defini / Geral</option>
                {GOAL_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Concurso pretendido (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: TJ-SP, Polícia Federal ou deixar em branco"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Meta semanal (h)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={120}
                  step="0.5"
                  value={weeklyStudyTarget}
                  onChange={(e) => setWeeklyStudyTarget(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Questões/semana
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  step={10}
                  value={weeklyQuestionTarget}
                  onChange={(e) => setWeeklyQuestionTarget(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono-tabular"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] dark:bg-[#D4A853] text-sm font-semibold text-white dark:text-[#0F172A] hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Começar agora'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Pular e começar a estudar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
