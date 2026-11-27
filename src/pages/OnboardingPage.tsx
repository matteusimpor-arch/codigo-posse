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
    <div className="min-h-dvh bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col justify-center py-6 px-3.5 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-5">
        <div className="flex items-center justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-6">
          <h1 className="font-display text-xl font-bold text-[var(--text-main)]">
            Configuração inicial
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Defina o essencial agora ou pule para começar a estudar.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                Seu nome *
              </label>
              <input
                type="text"
                placeholder="Ex: Mariana Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base text-[var(--text-main)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                Área de interesse (opcional)
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base text-[var(--text-main)]"
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
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                Concurso pretendido (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: TJ-SP, Polícia Federal"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base text-[var(--text-main)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
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
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base font-mono-tabular text-[var(--text-main)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
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
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-base font-mono-tabular text-[var(--text-main)]"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-[var(--negative)]" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] text-sm font-semibold text-[var(--gold-ink)] hover:opacity-95 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Começar agora'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="w-full min-h-[46px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
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
